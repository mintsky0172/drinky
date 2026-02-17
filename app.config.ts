import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  ios: {
    ...config.ios,
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID ?? "",
          ],
        },
      ],
    },
  },
});
