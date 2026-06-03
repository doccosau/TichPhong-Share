use mdns_sd::{ServiceDaemon, ServiceEvent};

#[tokio::main]
async fn main() {
    let mdns = ServiceDaemon::new().expect("Failed to create mdns daemon");
    let receiver = mdns.browse("_localsend._tcp.local.").expect("Failed to browse");
    println!("Listening for _localsend._tcp.local.");
    while let Ok(event) = receiver.recv_async().await {
        println!("{:?}", event);
    }
}
