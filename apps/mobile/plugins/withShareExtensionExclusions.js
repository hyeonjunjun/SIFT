
const { withPodfile } = require('@expo/config-plugins');

const withShareExtensionExclusions = (config) => {
    return withPodfile(config, (config) => {
        const podfileContent = config.modResults.contents;

        // We want to replace the standard "target 'ShareExtension' do ... end" block 
        // with our custom block that avoids use_native_modules!

        // Regex to find the ShareExtension block
        const shareExtensionRegex = /target 'ShareExtension' do[\s\S]*?end/g;

        const replacement = `target 'ShareExtension' do
  # Only import what we actually need
  pod 'React-Core', :path => '../node_modules/react-native/'
  pod 'React-RCTImage', :path => '../node_modules/react-native/Libraries/Image'
  pod 'React-RCTNetwork', :path => '../node_modules/react-native/Libraries/Network'
  pod 'React-RCTText', :path => '../node_modules/react-native/Libraries/Text'
  pod 'React-RCTLinking', :path => '../node_modules/react-native/Libraries/LinkingIOS'
  pod 'React-RCTSettings', :path => '../node_modules/react-native/Libraries/Settings'
  pod 'React-RCTAnimation', :path => '../node_modules/react-native/Libraries/NativeAnimation'
  
  # Add expo-share-intent
  pod 'expo-share-intent', :path => '../node_modules/expo-share-intent/ios'
  
  # Add expo-modules-core (required for expo-share-intent)
  pod 'ExpoModulesCore', :path => '../node_modules/expo-modules-core/ios'
  
  # DO NOT use use_native_modules!
  # use_native_modules!
  
  # Inherit search paths and configuration from the main project
  # inherit! :complete # Commented out to potentially avoid inheriting unwanted settings/deps, but usually needed because ShareExtension is inside the project
end`;

        if (podfileContent.match(shareExtensionRegex)) {
            config.modResults.contents = podfileContent.replace(shareExtensionRegex, replacement);
        } else {
            // If not found, append it (though it should be there due to expo-share-intent plugin?)
            // Actually, expo-share-intent plugin usually adds this block. 
            // If my plugin runs AFTER that, it should replace it.
            // Or I can just ensure this plugin runs last.
            // For now, let's assume it exists or we append it.
            // But simpler: we just search for the block and replace.
            // If it's not found, maybe we should warn.
            console.warn("ShareExtension block not found in Podfile, appending...");
            config.modResults.contents += "\n" + replacement;
        }

        return config;
    });
};

module.exports = withShareExtensionExclusions;
