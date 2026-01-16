
const { withPodfile } = require('expo/config-plugins');

const withShareExtensionExclusions = (config) => {
    if (config.modRequest?.platform !== 'ios') {
        return config;
    }
    return withPodfile(config, (config) => {
        const podfileContent = config.modResults.contents;

        // We want to replace the standard "target 'ShareExtension' do ... end" block 
        // with our custom block that avoids use_native_modules!

        // Regex to find the ShareExtension block
        // Since ShareExtension is typically the last target, we replace from its start header to the end of the file.
        // This avoids complex nested block matching.
        const shareExtensionRegex = /target 'ShareExtension' do[\s\S]*$/;

        // Add post_install hook to disable APPLICATION_EXTENSION_API_ONLY
        const postInstallReplacement = `post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'NO'
      end
    end`;


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
  pod 'ExpoShareIntentModule', :path => '../node_modules/expo-share-intent/ios'
  
  # Add expo-modules-core (required for expo-share-intent)
  pod 'ExpoModulesCore', :path => '../node_modules/expo-modules-core'
  
  # DO NOT use use_native_modules!
  # use_native_modules!
  
  # Inherit search paths and configuration from the main project
  inherit! :complete
end`;

        let newContent = podfileContent;

        if (newContent.match(shareExtensionRegex)) {
            newContent = newContent.replace(shareExtensionRegex, replacement);
        } else {
            // If not found, append it
            console.warn("ShareExtension block not found in Podfile, appending...");
            newContent += "\n" + replacement;
        }

        // Apply post_install replacement to disable APPLICATION_EXTENSION_API_ONLY
        if (newContent.includes('post_install do |installer|')) {
            newContent = newContent.replace('post_install do |installer|', postInstallReplacement);
        } else {
            console.warn("post_install block not found during Config Plugin execution!");
        }

        config.modResults.contents = newContent;

        return config;
    });
};

module.exports = withShareExtensionExclusions;
