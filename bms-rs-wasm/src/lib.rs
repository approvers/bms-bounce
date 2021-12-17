use bms_rs::{
    lex::parse,
    parse::{rng::RngMock, Bms},
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BmsData(Bms);

#[wasm_bindgen]
pub struct RandomConfig {}

#[wasm_bindgen]
pub fn parse_bms(source: &str, _random_config: RandomConfig) -> BmsData {
    let token_stream = parse(source).unwrap();
    let rng = RngMock([1]);
    let bms = Bms::from_token_stream(&token_stream, rng).unwrap();
    BmsData(bms)
}
