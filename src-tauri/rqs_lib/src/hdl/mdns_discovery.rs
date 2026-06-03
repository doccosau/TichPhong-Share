use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use mdns_sd::{ServiceDaemon, ServiceEvent};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;
use ts_rs::TS;

use crate::utils::{is_not_self_ip, parse_mdns_endpoint_info};
use crate::DeviceType;

#[derive(Debug, Clone, Default, Deserialize, Serialize, TS)]
#[ts(export)]
pub struct EndpointInfo {
    pub fullname: String,
    pub id: String,
    pub name: Option<String>,
    pub ip: Option<String>,
    pub port: Option<String>,
    pub rtype: Option<DeviceType>,
    pub present: Option<bool>,
}

pub struct MDnsDiscovery {
    daemon: ServiceDaemon,
    sender: broadcast::Sender<EndpointInfo>,
}

impl MDnsDiscovery {
    pub fn new(sender: broadcast::Sender<EndpointInfo>) -> Result<Self, anyhow::Error> {
        let daemon = ServiceDaemon::new()?;

        Ok(Self { daemon, sender })
    }

    pub async fn run(self, ctk: CancellationToken) -> Result<(), anyhow::Error> {
        info!("MDnsDiscovery: service starting");

        let service_type = "_FC9F5ED42C8A._tcp.local.";
        let receiver = self.daemon.browse(service_type)?;

        // Map with fullname as key and EndpointInfo as value
        let cache: Arc<Mutex<HashMap<String, EndpointInfo>>> = Arc::new(Mutex::new(HashMap::new()));

        loop {
            tokio::select! {
                _ = ctk.cancelled() => {
                    info!("MDnsDiscovery: tracker cancelled, breaking");
                    break;
                }
                r = receiver.recv_async() => {
                    match r {
                        Ok(event) => {
                            match event {
                                ServiceEvent::ServiceResolved(info) => {
                                    let port_str = info.get_port().to_string();

                                    let ip_hash: std::collections::HashSet<std::net::Ipv4Addr> = info.get_addresses_v4().iter().map(|ip| **ip).collect();
                                    if ip_hash.is_empty() {
                                        continue;
                                    }

                                    // Decode the "n" text properties
                                    let n = match info.get_property("n") {
                                        Some(_n) => _n.clone(),
                                        None => continue,
                                    };

                                    // Parse the endpoint info
                                    let (dt, dn) = match parse_mdns_endpoint_info(n.val_str()) {
                                        Ok(r) => r,
                                        Err(_) => continue
                                    };

                                    let fullname = info.get_fullname().to_string();
                                    let sender_clone = self.sender.clone();
                                    let cache_clone = cache.clone();

                                    tokio::spawn(async move {
                                        let mut working_ip = None;
                                        for ip in ip_hash.iter() {
                                            if !is_not_self_ip(ip) {
                                                continue;
                                            }
                                            let ip_port = format!("{ip}:{port_str}");
                                            if let Ok(Ok(_)) = tokio::time::timeout(std::time::Duration::from_millis(800), TcpStream::connect(&ip_port)).await {
                                                working_ip = Some(*ip);
                                                break;
                                            }
                                        }

                                        let ip = match working_ip {
                                            Some(ip) => ip,
                                            None => {
                                                match ip_hash.iter().find(|ip| is_not_self_ip(*ip)) {
                                                    Some(i) => *i,
                                                    None => return,
                                                }
                                            }
                                        };

                                        let ip_port = format!("{ip}:{port_str}");

                                        let ei = EndpointInfo {
                                            fullname: fullname.clone(),
                                            id: ip_port,
                                            name: Some(dn),
                                            ip: Some(ip.to_string()),
                                            port: Some(port_str),
                                            rtype: Some(dt),
                                            present: Some(true),
                                        };
                                        info!("ServiceResolved: Resolved a new service: {:?}", ei);

                                        if let Ok(mut cache_lock) = cache_clone.lock() {
                                            cache_lock.insert(fullname.clone(), ei.clone());
                                        }
                                        let _ = sender_clone.send(ei);
                                    });
                                }
                                ServiceEvent::ServiceRemoved(_, fullname) => {
                                    trace!("ServiceRemoved: checking if should remove {}", fullname);
                                    // Only remove if it has not been seen in the last cleanup_threshold
                                    let should_remove = if let Ok(mut cache_lock) = cache.lock() {
                                        let removed = cache_lock.remove(&fullname);
                                        removed.map(|ei| ei.id)
                                    } else {
                                        None
                                    };

                                    if let Some(id) = should_remove {
                                        info!("ServiceRemoved: Remove a previous service: {}", fullname);
                                        let _ = self.sender.send(EndpointInfo {
                                            id,
                                            ..Default::default()
                                        });
                                    }
                                }
                                ServiceEvent::SearchStarted(_) | ServiceEvent::SearchStopped(_) => {}
                                _ => {}
                            }
                        },
                        Err(err) => error!("MDnsDiscovery: error: {}", err),
                    }
                }
            }
        }

        Ok(())
    }
}
