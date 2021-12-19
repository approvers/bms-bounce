import { ChangeEvent, useState } from "react";
import { NextPage } from "next";
import toWav from "audiobuffer-to-wav";

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

const bounce = async (
  source: string,
  filename: string,
  files: Readonly<Record<string, Blob>>,
  nameView: (message: string) => void,
) => {
  nameView("WAV 読込中");
  const { BmsData, RandomConfig } = await import(
    "../bms-rs-wasm/pkg/bms_rs_wasm"
  );
  const bms = new BmsData(source, new RandomConfig(true));

  const ctx = new AudioContext();
  const audioCache: Record<string, AudioBuffer> = {};
  await Promise.all(
    Object.entries(files).map(async ([filename, file]) => {
      if (isAudioFilename(filename) && !audioCache[filename]) {
        const audio = await ctx.decodeAudioData(await file.arrayBuffer());
        bms.add_audio_length(filename, audio.duration);
        audioCache[filename] = audio;
      }
    }),
  );

  nameView("変換中");
  const lengthSeconds = bms.length_seconds();
  const buf = ctx.createBuffer(2, lengthSeconds * sampleRate, sampleRate);
  const audioSeconds: [string, number][] = bms.audio_play_seconds();
  for (const [filename, seconds] of audioSeconds) {
    const audio = audioCache[filename];
    writeBuffer(audio, buf, secondsToIndex(seconds));
  }
  nameView("変換完了");

  const rendered = new Uint8Array(toWav(buf, { float32: true }));
  const downloader = document.createElement("a");
  downloader.download = filename.split(".")[0] + ".wav";
  downloader.href = URL.createObjectURL(new Blob([rendered]));
  downloader.click();
};

const extractSoundFiles = (files: FileList): Record<string, Blob> =>
  Object.values(files).reduce(
    (prev, curr) => ({ ...prev, [curr.name]: curr }),
    {},
  );

const firstBmsIndex = (files: FileList) =>
  Object.keys(files).filter((key) => {
    const exts = files[key].name.split(".");
    const ext = exts[exts.length - 1];
    return ["bms", "bme", "bml", "pms"].includes(ext);
  })[0];

const fileHandler =
  (setBouncing: (v: boolean) => void, setLoadingName: (v: string) => void) =>
  async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (4 < files.length) {
      setBouncing(true);
      const soundFiles: Record<string, Blob> = extractSoundFiles(files);
      const bms: File = files[firstBmsIndex(files)];
      const bmsSource = await bms.text();
      try {
        await bounce(bmsSource, bms.name, soundFiles, (name) =>
          setLoadingName(name),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setBouncing(false);
      }
    }
  };

const Index: NextPage = () => {
  const [bouncing, setBouncing] = useState(false);
  const [loadingName, setLoadingName] = useState("");

  return (
    <div>
      <h1>BMS Bouncer</h1>
      <h3>
        {bouncing
          ? "バウンス中…"
          : "BMSファイルが入ったフォルダ内のファイル全てを選択してね"}
      </h3>
      <h4>{loadingName}</h4>
      <input
        type="file"
        multiple
        onChange={fileHandler(setBouncing, setLoadingName)}
      />
      <style jsx>{``}</style>
    </div>
  );
};

export default Index;
