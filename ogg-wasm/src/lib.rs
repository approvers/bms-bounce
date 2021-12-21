use lewton::inside_ogg::OggStreamReader;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OggDecoder {
    reader: OggStreamReader<Cursor<Box<[u8]>>>,
}

#[wasm_bindgen]
impl OggDecoder {
    #[wasm_bindgen(constructor)]
    pub fn new(blob: Box<[u8]>) -> Self {
        let buf_reader = Cursor::new(blob);
        let reader = OggStreamReader::new(buf_reader).expect("failed to read ogg blob");
        Self { reader }
    }

    pub fn read_next_channel(&mut self) -> Option<Box<[f64]>> {
        let channel = self
            .reader
            .read_dec_packet_itl()
            .expect("failed to read packet")?;
        let converted: Vec<_> = channel
            .into_iter()
            .map(|s| s as f64 / i16::MAX as f64)
            .collect();
        Some(converted.into_boxed_slice())
    }
}
