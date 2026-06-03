#[macro_use]
extern crate log;

use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};

use anyhow::anyhow;
use channel::ChannelMessage;
#[cfg(all(feature = "experimental", target_os = "linux"))]
use hdl::BleAdvertiser;
use hdl::MDnsDiscovery;
use once_cell::sync::Lazy;
use rand::distr::Alphanumeric;
use rand::Rng;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, mpsc, watch};
use tokio_util::sync::CancellationToken;
use tokio_util::task::TaskTracker;

#[cfg(feature = "experimental")]
use crate::hdl::BleListener;
use crate::hdl::MDnsServer;
use crate::manager::TcpServer;

pub mod channel;
mod errors;
mod hdl;
mod manager;
mod utils;

pub use hdl::{EndpointInfo, OutboundPayload, State, Visibility};
pub use manager::SendInfo;
pub use utils::DeviceType;

pub mod sharing_nearby {
    include!(concat!(env!("OUT_DIR"), "/sharing.nearby.rs"));
}

pub mod securemessage {
    include!(concat!(env!("OUT_DIR"), "/securemessage.rs"));
}

pub mod securegcm {
    include!(concat!(env!("OUT_DIR"), "/securegcm.rs"));
}

pub mod location_nearby_connections {
    include!(concat!(env!("OUT_DIR"), "/location.nearby.connections.rs"));
}

static CUSTOM_DOWNLOAD: Lazy<RwLock<Option<PathBuf>>> = Lazy::new(|| RwLock::new(None));

#[derive(Debug)]
pub struct RQS {
    tracker: Option<TaskTracker>,
    ctoken: Option<CancellationToken>,
    // Discovery token is different than ctoken because he is on his own
    // - can be cancelled while the ctoken is still active
    discovery_ctk: Option<CancellationToken>,

    // Used to trigger a change in the mDNS visibility (and later on, BLE)
    pub visibility_sender: Arc<Mutex<watch::Sender<Visibility>>>,
    visibility_receiver: watch::Receiver<Visibility>,

    // Only used to send the info "a nearby device is sharing"
    ble_sender: broadcast::Sender<()>,

    port_number: Option<u32>,

    pub message_sender: broadcast::Sender<ChannelMessage>,

    endpoint_id: [u8; 4],
}

impl Default for RQS {
    fn default() -> Self {
        Self::new(Visibility::Visible, None, None)
    }
}

impl RQS {
    pub fn new(
        visibility: Visibility,
        port_number: Option<u32>,
        download_path: Option<PathBuf>,
    ) -> Self {
        let mut guard = CUSTOM_DOWNLOAD.write().unwrap();
        *guard = download_path;

        let (message_sender, _) = broadcast::channel(50);
        let (ble_sender, _) = broadcast::channel(5);

        // Define default visibility as per the args inside the new()
        let (visibility_sender, visibility_receiver) = watch::channel(Visibility::Invisible);
        let _ = visibility_sender.send(visibility);

        let endpoint_id_vec: Vec<u8> = rand::rng()
            .sample_iter(Alphanumeric)
            .take(4)
            .map(u8::from)
            .collect();
        let mut endpoint_id = [0u8; 4];
        endpoint_id.copy_from_slice(&endpoint_id_vec);

        Self {
            tracker: None,
            ctoken: None,
            discovery_ctk: None,
            visibility_sender: Arc::new(Mutex::new(visibility_sender)),
            visibility_receiver,
            ble_sender,
            port_number,
            message_sender,
            endpoint_id,
        }
    }

    pub async fn run(
        &mut self,
    ) -> Result<(mpsc::Sender<SendInfo>, broadcast::Receiver<()>), anyhow::Error> {
        let tracker = TaskTracker::new();
        let ctoken = CancellationToken::new();
        self.tracker = Some(tracker.clone());
        self.ctoken = Some(ctoken.clone());

        let endpoint_id = self.endpoint_id;
        let tcp_listener =
            TcpListener::bind(format!("0.0.0.0:{}", self.port_number.unwrap_or(0))).await?;
        let binded_addr = tcp_listener.local_addr()?;
        info!("TcpListener on: {}", binded_addr);

        // MPSC for the TcpServer
        let send_channel = mpsc::channel(10);
        // Start TcpServer in own "task"
        let mut server = TcpServer::new(
            endpoint_id,
            tcp_listener,
            self.message_sender.clone(),
            send_channel.1,
        )?;
        let ctk = ctoken.clone();
        tracker.spawn(async move { server.run(ctk).await });

        let hostname =
            hostname::get().map(|h| h.to_string_lossy().to_string()).unwrap_or_else(|_| "TichPhongOS".to_string());
        let endpoint_info_raw =
            crate::utils::gen_endpoint_info(crate::utils::DeviceType::Laptop as u8, &hostname);

        #[cfg(feature = "experimental")]
        {
            // Don't threat BleListener error as fatal, it's a nice to have.
            if let Ok(ble) = BleListener::new(self.ble_sender.clone()).await {
                let ctk = ctoken.clone();
                tracker.spawn(async move { ble.run(ctk).await });
            }
        }

        #[cfg(all(feature = "experimental", target_os = "linux"))]
        {
            let ctk_blea = ctoken.clone();
            let vis_receiver = self.visibility_receiver.clone();
            let ble_adv_payload =
                crate::utils::gen_fef3_fast_advertisement(endpoint_id, &endpoint_info_raw);
            tracker.spawn(async move {
                let uuid = uuid::Uuid::parse_str("0000fef3-0000-1000-8000-00805f9b34fb").unwrap();
                match BleAdvertiser::new(uuid, ble_adv_payload).await {
                    Ok(blea) => {
                        if let Err(e) = blea.run(ctk_blea, vis_receiver).await {
                            error!("BleAdvertiser (FEF3) error: {}", e);
                        }
                    }
                    Err(e) => error!("Couldn't init BleAdvertiser (FEF3): {}", e),
                }
            });
        }

        // Start MDnsServer in own "task"
        let mut mdns = MDnsServer::new(
            endpoint_id,
            endpoint_info_raw,
            binded_addr.port(),
            self.ble_sender.subscribe(),
            self.visibility_sender.clone(),
            self.visibility_receiver.clone(),
        )?;
        let ctk = ctoken.clone();
        tracker.spawn(async move { mdns.run(ctk).await });

        tracker.close();

        Ok((send_channel.0, self.ble_sender.subscribe()))
    }

    pub fn discovery(
        &mut self,
        sender: broadcast::Sender<EndpointInfo>,
    ) -> Result<(), anyhow::Error> {
        let tracker = self
            .tracker
            .as_ref()
            .ok_or_else(|| anyhow!("The service wasn't first started"))?;

        let ctk = CancellationToken::new();
        self.discovery_ctk = Some(ctk.clone());

        let endpoint_id = self.endpoint_id;

        #[cfg(all(feature = "experimental", target_os = "linux"))]
        {
            let ctk_blea = ctk.clone();
            tracker.spawn(async move {
                let uuid = uuid::Uuid::parse_str("0000fe2c-0000-1000-8000-00805f9b34fb").unwrap();
                let ble_pulse_payload = crate::utils::gen_fe2c_pulse(endpoint_id);
                let blea = match BleAdvertiser::new(uuid, ble_pulse_payload).await {
                    Ok(b) => b,
                    Err(e) => {
                        error!("Couldn't init BleAdvertiser (FE2C): {}", e);
                        return;
                    }
                };

                let (_dummy_sender, dummy_receiver) = watch::channel(Visibility::Visible);
                if let Err(e) = blea.run(ctk_blea, dummy_receiver).await {
                    error!("BleAdvertiser (FE2C) error: {}", e);
                }
            });
        }

        let discovery = MDnsDiscovery::new(sender)?;
        tracker.spawn(async move { discovery.run(ctk.clone()).await });

        Ok(())
    }

    pub fn stop_discovery(&mut self) {
        if let Some(discovert_ctk) = &self.discovery_ctk {
            discovert_ctk.cancel();
            self.discovery_ctk = None;
        }
    }

    pub fn change_visibility(&mut self, nv: Visibility) {
        self.visibility_sender
            .lock()
            .unwrap()
            .send_modify(|state| *state = nv);
    }

    pub async fn stop(&mut self) {
        self.stop_discovery();

        if let Some(ctoken) = &self.ctoken {
            ctoken.cancel();
        }

        if let Some(tracker) = &self.tracker {
            tracker.wait().await;
        }

        self.ctoken = None;
        self.tracker = None;
    }

    // Setting None here will resume the default settings
    pub fn set_download_path(&self, p: Option<PathBuf>) {
        debug!("Setting the download path to {:?}", p);
        let mut guard = CUSTOM_DOWNLOAD.write().unwrap();
        *guard = p;
    }
}
