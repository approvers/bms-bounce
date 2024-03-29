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
    assert_eq!(
        data.process_notes().collect::<Vec<_>>(),
        vec![
            ("a.wav", 0.0),
            ("b.wav", 2.0),
            ("c.wav", 4.0),
            ("d.wav", 5.0),
            ("e.wav", 6.0),
        ]
    );
}

#[test]
fn multiple() {
    let mut data = BmsData::new(
        r"
        #BPM 120
        #WAV01 a.wav
        #WAV02 b.wav
        #WAV03 c.wav
        #WAV04 d.wav
        #WAV05 e.wav

        #00111:01
        #00112:02
        #00211:0304
        #00212:0005
        ",
        RandomConfig::default(),
    );
    data.add_audio_length("a.wav", 3.0);
    data.add_audio_length("b.wav", 3.0);
    data.add_audio_length("c.wav", 1.5);
    data.add_audio_length("d.wav", 1.5);
    data.add_audio_length("e.wav", 2.0);
    assert_eq!(data.length_seconds(), 5.0);
    assert_eq!(
        data.process_notes().collect::<Vec<_>>(),
        vec![
            ("a.wav", 0.0),
            ("b.wav", 0.0),
            ("c.wav", 2.0),
            ("d.wav", 3.0),
            ("e.wav", 3.0),
        ]
    );
}
