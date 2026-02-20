import { TAB_BAR } from "@/src/constants/tabBar";
import { TAB_ICONS } from "@/src/constants/tabIcons";
import { Tabs } from "expo-router";
import { Image, StyleSheet } from "react-native";

function TabIcon({
  routeKey,
  focused,
}: {
  routeKey: keyof typeof TAB_ICONS;
  focused: boolean;
}) {
  const source = focused ? TAB_ICONS[routeKey].active : TAB_ICONS[routeKey].inactive;

  return (
    <Image
      source={source}
      style={styles.tabIcon}
      resizeMode="contain"
    />
    )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },

        // 탭바
        tabBarStyle: TAB_BAR.style as any,
        tabBarActiveTintColor: TAB_BAR.activeTintColor,
        tabBarInactiveTintColor: TAB_BAR.inactiveTintColor,
        tabBarLabelStyle: TAB_BAR.labelStyle as any,
        tabBarItemStyle: {
          paddingTop: TAB_BAR.paddingTop,
          paddingBottom: TAB_BAR.paddingBottom,
        },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarLabel: "Calendar",
          tabBarIcon: ({ focused }) => <TabIcon routeKey="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon routeKey="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Mypage",
          tabBarLabel: "Mypage",
          tabBarIcon: ({ focused }) => <TabIcon routeKey="mypage" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 24,
    height: 24,
  },
});
