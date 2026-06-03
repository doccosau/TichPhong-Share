use std::sync::Arc;

use bluer::adv::Advertisement;
use bytes::Bytes;
use tokio::sync::watch;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

const INNER_NAME: &str = "BleAdvertiser";

#[derive(Debug, Clone)]
pub struct BleAdvertiser {
    adapter: Arc<bluer::Adapter>,
    service_uuid: Uuid,
    service_data: Bytes,
}

impl BleAdvertiser {
    pub async fn new(service_uuid: Uuid, service_data: Vec<u8>) -> Result<Self, anyhow::Error> {
        let session = bluer::Session::new().await?;
        let adapter = session.default_adapter().await?;
        adapter.set_powered(true).await?;

        Ok(Self {
            adapter: Arc::new(adapter),
            service_uuid,
            service_data: Bytes::from(service_data),
        })
    }

    pub async fn run(
        &self,
        ctk: CancellationToken,
        mut visibility_receiver: watch::Receiver<crate::Visibility>,
    ) -> Result<(), anyhow::Error> {
        info!(
            "{INNER_NAME}: advertising on Bluetooth adapter {} with address {} for UUID {}",
            self.adapter.name(),
            self.adapter.address().await?,
            self.service_uuid,
        );

        // Add a small delay to prevent immediate conflict with btleplug init
        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

        let mut handle = None;
        let mut visibility = *visibility_receiver.borrow();

        loop {
            if (visibility == crate::Visibility::Visible
                || visibility == crate::Visibility::Temporarily)
                && handle.is_none()
            {
                let mut retry_count = 0;
                let new_handle = loop {
                    match self
                        .adapter
                        .advertise(
                            self.get_advertisment(self.service_uuid, self.service_data.clone()),
                        )
                        .await
                    {
                        Ok(h) => break Some(h),
                        Err(e) => {
                            retry_count += 1;
                            if retry_count >= 5 {
                                error!("{INNER_NAME}: Failed to register advertisement: {}", e);
                                break None;
                            }
                            warn!("{INNER_NAME}: Failed to register advertisement: {}, retrying in 2s ({}/5)", e, retry_count);
                            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                        }
                    }
                };
                handle = new_handle;
            } else if visibility == crate::Visibility::Invisible && handle.is_some() {
                handle = None; // Drops the advertisement handle, stopping the broadcast
            }

            tokio::select! {
                _ = ctk.cancelled() => {
                    info!("{INNER_NAME}: tracker cancelled, returning");
                    break;
                }
                _ = visibility_receiver.changed() => {
                    visibility = *visibility_receiver.borrow_and_update();
                }
            }
        }

        drop(handle);

        Ok(())
    }

    fn get_advertisment(&self, service_uuid: Uuid, adv_data: Bytes) -> Advertisement {
        Advertisement {
            advertisement_type: bluer::adv::Type::Peripheral,
            service_data: [(service_uuid, adv_data.into())].into(),
            discoverable: Some(true),
            ..Default::default()
        }
    }
}
