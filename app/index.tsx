import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'

const SplashScreen = () => {
    const router = useRouter();
  return (
    <View>
      <Text>SplashScreen</Text>
    </View>
  )
}

export default SplashScreen

const styles = StyleSheet.create({})