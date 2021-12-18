import { ChangeEvent, useState } from "react";
import { NextPage } from "next";
import toWav from "audiobuffer-to-wav";

const writeBuffer = (
  src: AudioBuffer,
  dst: AudioBuffer,
  offsetIndex: number,
) => {
  for (let channel = 0; channel < dst.numberOfChannels; ++channel) {
    const dstArray = dst.getChannelData(channel);
    const srcArray = src.getChannelData(channel);
    for (let index = 0; index < srcArray.length; index++) {
      dstArray[index + offsetIndex] = srcArray[index];
    }
  }
};

const sampleRate = 44100;

const secondsToIndex = (seconds: number) => Math.round(seconds * sampleRate);

const bounce = async (
  source: string,
  filename: string,
  files: Readonly<Record<string, Blob>>,
  nameView: (message: string) => void,
) => {
  const { BmsData } = await import("../bms-rs-wasm/pkg/bms_rs_wasm");
  const bms = new BmsData(source, { free: () => {} });
  const lengthSeconds = bms.length_seconds();
  const ctx = new AudioContext();
  const buf = ctx.createBuffer(2, lengthSeconds * sampleRate, sampleRate);
  const audioSeconds: [string, number][] = bms.audio_play_seconds();
  const audioCache: Record<string, AudioBuffer> = {};
  for (const [filename, seconds] of audioSeconds) {
    nameView(filename);
    if (!audioCache[filename]) {
      audioCache[filename] = await ctx.decodeAudioData(
        await files[filename].arrayBuffer(),
      );
    }
    const audio = audioCache[filename];
    writeBuffer(audio, buf, secondsToIndex(seconds));
  }
  nameView("WAV に変換完了");

  const rendered = new Uint8Array(toWav(buf, { float32: true }));
  const downloader = document.createElement("a");
  downloader.download = filename.split(".")[0] + ".wav";
  downloader.href = URL.createObjectURL(new Blob([rendered]));
  downloader.click();
};

const fileHandler =
  (setBouncing: (v: boolean) => void, setLoadingName: (v: string) => void) =>
  (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (4 < files.length) {
      setBouncing(true);
      const soundFiles: Record<string, Blob> = {};
      const firstBMSIndex = Object.keys(files).filter((key) => {
        soundFiles[files[key].name.split(".")[0]] = files[key];
        const exts = files[key].name.split(".");
        const ext = exts[exts.length - 1];
        return ["bms", "bme", "bml", "pms"].includes(ext);
      })[0];
      const bms = files[firstBMSIndex];
      const reader = new FileReader();
      reader.onload = (e) => {
        bounce(e.target.result as string, bms.name, soundFiles, (name) => {
          setBouncing(true);
          setLoadingName(name);
        }).finally(() => setBouncing(false));
      };
      reader.readAsText(bms);
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
