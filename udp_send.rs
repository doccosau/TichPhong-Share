use std::net::UdpSocket;
fn main() {
    let socket = UdpSocket::bind("0.0.0.0:0").expect("couldn't bind to address");
    socket.set_broadcast(true).unwrap();
    let msg = r#"{"alias":"FakePhone","version":"2.0","deviceModel":"iPhone","deviceType":"mobile","fingerprint":"some-fake-hash","port":53317,"protocol":"https","download":true,"announce":true}"#;
    socket.send_to(msg.as_bytes(), "255.255.255.255:53317").unwrap();
    socket.send_to(msg.as_bytes(), "224.0.0.167:53317").unwrap();
    println!("Sent UDP broadcast");
}
