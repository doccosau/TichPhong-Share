#[tokio::main]
async fn main() {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        // .danger_accept_invalid_hostnames(true)
        .build();
    println!("{:?}", client.is_ok());
}
