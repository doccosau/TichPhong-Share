use std::net::UdpSocket;
fn main() {
    let socket = UdpSocket::bind("0.0.0.0:53317").expect("couldn't bind to address");
    let mut buf = [0; 2048];
    println!("Listening on 53317...");
    loop {
        match socket.recv_from(&mut buf) {
            Ok((amt, src)) => {
                let s = String::from_utf8_lossy(&buf[..amt]);
                println!("Received from {}: {}", src, s);
            }
            Err(e) => println!("Error: {}", e),
        }
    }
}
