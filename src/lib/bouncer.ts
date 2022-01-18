import toWav from "audiobuffer-to-wav";

export type Message = "LoadingWav" | "Bouncing" | "Bounced";

const writeBuffer = (
  src: AudioBuffer,
  dst: AudioBuffer,
  offsetIndex: number,
) => {
  const isSrcSingle = src.numberOfChannels === 1;
  for (let channel = 0; channel < dst.numberOfChannels; ++channel) {
    const dstArray = dst.getChannelData(channel);
    const srcArray = src.getChannelData(isSrcSingle ? 0 : channel);
    for (let index = 0; index < srcArray.length; ++index) {
      dstArray[index + offsetIndex] += srcArray[index];
    }
  }
};

const sampleRate = 44100;

const secondsToIndex = (seconds: number) => Math.round(seconds * sampleRate);

const isAudioFilename = (filename: string) =>
  filename.endsWith(".wav") || filename.endsWith(".ogg");

const decodeAudio = async (
  ctx: AudioContext,
  filename: string,
  file: Blob,
): Promise<AudioBuffer> => {
  if (filename.endsWith(".wav")) {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  }
  if (filename.endsWith(".ogg")) {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const source = ctx.createMediaElementSource(audio);
    await ctx.audioWorklet.addModule("ogg-reader.js");
    const array = [[], []];
    const reader = new AudioWorkletNode(ctx, "ogg-reader", {
      processorOptions: {
        array,
      },
    });
    source.connect(reader);
    await new Promise((resolve) => {
      reader.onprocessorerror = resolve;
      audio.play();
    });
    const buf = ctx.createBuffer(2, array[0].length, 44100);
    array.forEach((channel, i) =>
      buf.copyToChannel(Float32Array.from(channel), i),
    );
    return buf;
  }
  throw new Error("unreachable");
};

export const bounce = async (
  source: string,
  filename: string,
  files: Readonly<Record<string, Blob>>,
  nameView: (message: Message) => void,
) => {
  nameView("LoadingWav");
  const { BmsData, RandomConfig } = await import(
    "../../bms-rs-wasm/pkg/bms_rs_wasm"
  );
  const bms = new BmsData(source, new RandomConfig(true));

  const ctx = new AudioContext();
  const audioBuffers: Record<string, AudioBuffer> = {};
  await Promise.all(
    Object.entries(files)
      .filter(([filename]) => isAudioFilename(filename))
      .map(async ([filename, file]) => {
        const audio = await decodeAudio(ctx, filename, file);
        if (audioBuffers[filename]) {
          return;
        }
        bms.add_audio_length(filename, audio.duration);
        audioBuffers[filename] = audio;
      }),
  );

  nameView("Bouncing");
  const lengthSeconds = bms.length_seconds();
  const buf = ctx.createBuffer(2, lengthSeconds * sampleRate, sampleRate);
  const audioSeconds: [string, number][] = bms.audio_play_seconds();
  for (const [filename, seconds] of audioSeconds) {
    const audio = audioBuffers[filename];
    writeBuffer(audio, buf, secondsToIndex(seconds));
  }
  nameView("Bounced");

  const rendered = new Uint8Array(toWav(buf, { float32: true }));
  const downloader = document.createElement("a");
  downloader.download = filename.split(".")[0] + ".wav";
  downloader.href = URL.createObjectURL(new Blob([rendered]));
  downloader.click();
};

export const extractSoundFiles = (files: FileList): Record<string, Blob> =>
  Object.values(files).reduce(
    (prev, curr) => ({ ...prev, [curr.name]: curr }),
    {},
  );

export const firstBmsIndex = (files: FileList) =>
  Object.keys(files).filter((key) => {
    const exts = files[key].name.split(".");
    const ext = exts[exts.length - 1];
    return ["bms", "bme", "bml", "pms"].includes(ext);
  })[0];
