#[cfg(test)]
mod tests;

use bms_rs::{
    lex::{command::ObjId, parse},
    parse::{
        notes::BpmChangeObj,
        obj::{Obj, ObjTime},
        rng::RngMock,
        Bms,
    },
};
use itertools::Itertools;
use js_sys::Array;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BmsData {
    bms: Bms,
    audio_lengths: HashMap<String, f64>,
}

#[wasm_bindgen]
impl BmsData {
    #[wasm_bindgen(constructor)]
    pub fn new(source: &str, _random_config: RandomConfig) -> Self {
        let token_stream = parse(source).unwrap();
        let rng = RngMock([1]);
        let bms = Bms::from_token_stream(&token_stream, rng).unwrap();
        Self {
            bms,
            audio_lengths: Default::default(),
        }
    }

    pub fn add_audio_length(&mut self, filename: &str, length: f64) {
        self.audio_lengths.insert(filename.into(), length);
    }

    pub fn audio_play_seconds(&self) -> Array {
        let res = Array::new_with_length(self.bms.notes.all_notes().count() as u32);
        let mut index = 0;
        self.process_notes()
            .for_each(|(filename, obj_start_seconds)| {
                let pair = Array::new_with_length(2);
                pair.set(0, filename.into());
                pair.set(1, obj_start_seconds.into());
                res.set(index, pair.into());
                index += 1;
            });
        res
    }

    pub fn length_seconds(&self) -> f64 {
        self.process_notes()
            .fold(0.0f64, |length_seconds, (filename, obj_start_seconds)| {
                let sound_seconds = self.audio_lengths[filename];
                let obj_end_seconds = obj_start_seconds + sound_seconds;

                length_seconds.max(obj_end_seconds)
            })
    }
}

impl BmsData {
    fn process_notes(&self) -> impl Iterator<Item = (&'_ str, f64)> + '_ {
        let notes = &self.bms.notes;
        notes
            .bgms()
            .iter()
            .flat_map(|(&offset, objs)| objs.iter().map(move |&obj| (offset, obj)))
            .chain(
                notes
                    .all_notes()
                    .map(|&Obj { offset, obj, .. }| (offset, obj)),
            )
            .sorted_by(|a, b| a.0.cmp(&b.0))
            .map(self.note_time_calculator())
    }

    fn note_time_calculator<'a>(&'a self) -> impl FnMut((ObjTime, ObjId)) -> (&'a str, f64) {
        let notes = &self.bms.notes;
        let bpm_changes = notes.bpm_changes();
        let section_len_changes = notes.section_len_changes();

        const DEFAULT_BPM: f64 = 130.0; // Defined on the BMS specification.
        let mut current_bpm = self.bms.header.bpm.unwrap_or(DEFAULT_BPM);
        let mut current_section_time = 0.0;
        let mut next_section_time = 0.0;
        let mut previous_section = 0;

        if let Some((_, &BpmChangeObj { bpm: first_bpm, .. })) =
            bpm_changes.range(..ObjTime::new(2, 0, 4)).next()
        {
            current_bpm = first_bpm;
        }

        move |(offset, obj)| {
            let ObjTime {
                track,
                numerator,
                denominator,
            } = offset;
            let filename = self.bms.header.wav_files[&obj]
                .file_name()
                .expect("not a file name specified in #WAV")
                .to_str()
                .unwrap();
            let current_section_len = section_len_changes
                .get(&offset)
                .map_or(1.0, |obj| obj.length);
            let sections_beats = 4.0 * current_section_len;
            let seconds_per_beat = 60.0 / current_bpm;
            let section_seconds = sections_beats * seconds_per_beat;
            if previous_section < track {
                current_section_time = next_section_time;
                previous_section = track;
            }
            let obj_offset_seconds = section_seconds * numerator as f64 / denominator as f64;
            let obj_start_seconds = current_section_time + obj_offset_seconds;
            next_section_time = current_section_time + section_seconds;
            if let Some((_, &BpmChangeObj { bpm: first_bpm, .. })) =
                bpm_changes.range(offset..).next()
            {
                current_bpm = first_bpm;
            }
            (filename, obj_start_seconds)
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Default)]
pub struct RandomConfig {
    use_actual_random: bool,
}

#[wasm_bindgen]
impl RandomConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(use_actual_random: bool) -> Self {
        Self { use_actual_random }
    }
}
