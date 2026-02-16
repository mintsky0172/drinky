import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/src/providers/AuthProvider';

const SplashScreen = () => {
    const router = useRouter();
    const { user, initializing } = useAuth();

    useEffect(() => {
        if(initializing) return;
        const initApp = async () => {
            // TODO : Firebase auth 체크
            await new Promise(resolve => setTimeout(resolve, 1800));
            if(user) router.replace('/(tabs)');
            else router.replace('/login');
        };

        initApp();
    }, [user, initializing]);

  return (
    <ImageBackground
        source={require("@/assets/images/loading_background.png")}
        style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
        resizeMode="cover"
    >
        <Image source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        />
    </ImageBackground>
  )
}

export default SplashScreen

const styles = StyleSheet.create({
    logo: {
        width: 220
    }
})