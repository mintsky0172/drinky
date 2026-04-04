import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
} from "react-native";
import React, { useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import AppText from "@/src/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "@/src/components/ui/AppButton";
import { COLORS } from "@/src/constants/colors";

const { width } = Dimensions.get("window");

type OnboardingItem = {
  id: string;
  title: string;
  description: string;
  emoji: string;
};

const ONBOARDING_DATA: OnboardingItem[] = [
  {
    id: "1",
    title: "오늘 마신 음료를 기록해요",
    description:
      "물, 커피, 차, 음료까지.\n하루의 마신 기록을 가볍게 남길 수 있어요.",
    emoji: "🥛",
  },
  {
    id: "2",
    title: "하루를 한 잔으로 남겨요",
    description:
      "그날 가장 어울리는 음료와 함께,\n오늘의 기분과 하루를 차곡차곡 쌓아가요.",
    emoji: "📅",
  },
  {
    id: "3",
    title: "지금, 한 잔 기록해 볼까요?",
    description: "빠르게 기록하고,\n나만의 음료 다이어리를 시작해 보세요.",
    emoji: "☕️",
  },
];

const OnboardingScreen = () => {
  const flatListRef = useRef<FlatList<OnboardingItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem("hasOnboarded", "true");
    router.replace("/(tabs)");
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem("hasOnboarded", "true");
    router.replace("/(tabs)");
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.illustrationBox}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        <View style={styles.textBox}>
          <AppText preset="h1" style={styles.title}>
            {item.title}
          </AppText>
          <AppText preset="h3" style={styles.description}>
            {item.description}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <AppText preset="body" style={styles.skipText}>
            건너뛰기
          </AppText>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsVerticalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={renderItem}
      />

      <View style={styles.bottomArea}>
        <View style={styles.indicatorContainer}>
          {ONBOARDING_DATA.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {currentIndex === ONBOARDING_DATA.length - 1 ? (
          <AppButton
            label="시작하기"
            variant="primary"
            onPress={handleFinish}
          />
        ) : (
          <AppButton label="다음" variant="secondary" onPress={handleNext} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base.creamPaper,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: {
    fontSize: 15,
    color: '#8C6B56'
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  illustrationBox: {
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#F1E3D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  emoji: {
    fontSize: 72,
  },
  textBox: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap : 8,
  },
  dot: {
    borderRadius: 999,
  },
  activeDot: {
    width: 22,
    height: 8,
    backgroundColor: COLORS.semantic.secondary
  },
  inactiveDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.ui.border
  },
});
