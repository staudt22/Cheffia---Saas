import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setPublicDir("./public");
Config.setEntryPoint("./src/index.ts");
if (process.env.BSE_CHROME) Config.setBrowserExecutable(process.env.BSE_CHROME);
