package com.tasbihi;

import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import java.util.Arrays;
import java.util.List;

// Manual package list (autolinking disabled)
public class PackageList {
    private final com.facebook.react.ReactNativeHost reactNativeHost;

    public PackageList(com.facebook.react.ReactNativeHost reactNativeHost) {
        this.reactNativeHost = reactNativeHost;
    }

    public List<ReactPackage> getPackages() {
        return Arrays.asList(
            new MainReactPackage()
        );
    }
}
