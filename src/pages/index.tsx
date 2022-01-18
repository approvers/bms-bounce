import { ChangeEvent, useState } from "react";
import {
  Message,
  bounce,
  extractSoundFiles,
  firstBmsIndex,
} from "../lib/bouncer";
import { NextPage } from "next";

const messageToDisplay: Record<Message, string> = {
  LoadingWav: "WAV 読込中",
  Bouncing: "変換中",
  Bounced: "変換完了",
};

const fileHandler =
  (setBouncing: (v: boolean) => void, setLoadingName: (v: string) => void) =>
  async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files.length <= 4) {
      return;
    }
    setBouncing(true);
    const soundFiles: Record<string, Blob> = extractSoundFiles(files);
    const bms: File = files[firstBmsIndex(files)];
    const bmsSource = await bms.text();
    try {
      await bounce(bmsSource, bms.name, soundFiles, (name) =>
        setLoadingName(messageToDisplay[name]),
      );
    } catch (e) {
      console.error(e);
      setLoadingName("");
    } finally {
      setBouncing(false);
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
