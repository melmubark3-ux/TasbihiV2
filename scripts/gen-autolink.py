#!/usr/bin/env python3
import json, os

autolink_config = {
    "project": {
        "android": {
            "packageName": "com.tasbihi",
            "sourceDir": "android/app/src/main/java"
        }
    },
    "dependencies": {
        "@notifee/react-native": {"root": "node_modules/@notifee/react-native", "platforms": {"android": {"sourceDir": "node_modules/@notifee/react-native/android"}}},
        "@react-native-async-storage/async-storage": {"root": "node_modules/@react-native-async-storage/async-storage", "platforms": {"android": {"sourceDir": "node_modules/@react-native-async-storage/async-storage/android"}}},
        "@react-native-community/geolocation": {"root": "node_modules/@react-native-community/geolocation", "platforms": {"android": {"sourceDir": "node_modules/@react-native-community/geolocation/android"}}},
        "@react-native-community/slider": {"root": "node_modules/@react-native-community/slider", "platforms": {"android": {"sourceDir": "node_modules/@react-native-community/slider/android"}}},
        "@react-native-picker/picker": {"root": "node_modules/@react-native-picker/picker", "platforms": {"android": {"sourceDir": "node_modules/@react-native-picker/picker/android"}}},
        "@react-native-voice/voice": {"root": "node_modules/@react-native-voice/voice", "platforms": {"android": {"sourceDir": "node_modules/@react-native-voice/voice/android"}}},
        "react-native-safe-area-context": {"root": "node_modules/react-native-safe-area-context", "platforms": {"android": {"sourceDir": "node_modules/react-native-safe-area-context/android"}}},
        "react-native-screens": {"root": "node_modules/react-native-screens", "platforms": {"android": {"sourceDir": "node_modules/react-native-screens/android"}}},
        "react-native-sound": {"root": "node_modules/react-native-sound", "platforms": {"android": {"sourceDir": "node_modules/react-native-sound/android"}}},
        "react-native-vector-icons": {"root": "node_modules/react-native-vector-icons", "platforms": {"android": {"sourceDir": "node_modules/react-native-vector-icons/android"}}}
    }
}

os.makedirs("android/build/generated/autolinking", exist_ok=True)
with open("android/build/generated/autolinking/autolinking.json", "w") as f:
    json.dump(autolink_config, f, indent=2)
print("Autolinking config generated via Python")
