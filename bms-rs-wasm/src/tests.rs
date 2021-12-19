use super::{BmsData, RandomConfig};

#[test]
fn simple() {
    let mut data = BmsData::new(
        r"
        #BPM 120
        #WAV01 a.wav
        #WAV02 b.wav
        #WAV03 c.wav
        #WAV04 d.wav
        #WAV05 e.wav

        #00111:01
        #00211:02
        #00311:0304
        #00411:05
        ",
        RandomConfig::default(),
    );
    data.add_audio_length("a.wav", 3.0);
    data.add_audio_length("b.wav", 3.0);
    data.add_audio_length("c.wav", 1.5);
    data.add_audio_length("d.wav", 1.5);
    data.add_audio_length("e.wav", 2.0);
    assert_eq!(data.length_seconds(), 8.0);
}
