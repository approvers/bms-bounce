use lewton::inside_ogg::OggStreamReader;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct OggDecoder {
    reader: OggStreamReader<Cursor<Box<[u8]>>>,
    data: Vec<Vec<i16>>,
}

#[wasm_bindgen]
impl OggDecoder {
    #[wasm_bindgen(constructor)]
    pub fn new(blob: Box<[u8]>) -> Self {
        let buf_reader = Cursor::new(blob);
        let mut reader = OggStreamReader::new(buf_reader).expect("failed to read ogg blob");
        let mut data = reader
            .read_dec_packet()
            .expect("failed to read packet")
            .expect("audio stream not found");
        data.reverse();
        Self { reader, data }
    }

    pub fn sample_rate(&self) -> u32 {
        self.reader.ident_hdr.audio_sample_rate
    }

    pub fn num_of_channels(&self) -> u8 {
        self.reader.ident_hdr.audio_channels
    }

    pub fn read_next_channel(&mut self) -> Option<Box<[f64]>> {
        self.data.pop().map(|channel| {
            let converted: Vec<_> = channel
                .into_iter()
                .map(|s| s as f64 / i16::MAX as f64)
                .collect();
            converted.into_boxed_slice()
        })
    }
}
