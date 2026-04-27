import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    ...config.android,
    intentFilters: [
      ...(config.android?.intentFilters ?? []),
      {
        action: "VIEW",
        data: [
          {
            scheme: "com.somin.drinky",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
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
