const { withPodfile } = require('@expo/config-plugins');

const withShareExtensionPodfile = (config) => {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    const targetBlock = `
target 'ShareExtension' do
  use_expo_modules!

  if ENV['EXPO_USE_COMMUNITY_AUTOLINKING'] == '1'
    config_command = ['node', '-e', "process.argv=['', '', 'config'];require('@react-native-community/cli').run()"];
  else
    config_command = [
      'node',
      '--no-warnings',
      '--eval',
      'require(\\'expo/bin/autolinking\\')',
      'expo-modules-autolinking',
      'react-native-config',
      '--json',
      '--platform',
      'ios'
    ]
  end

  config = use_native_modules!(config_command)
  
  # Inherit search paths and configuration from the main project
  inherit! :complete
end
`;

    // Regex to match existing ShareExtension target block (simple matching)
    const regex = /target 'ShareExtension' do[\s\S]*?end/g;
    let newContents = contents;

    if (regex.test(contents)) {
      console.log('Action: Replacing existing ShareExtension target in Podfile');
      newContents = newContents.replace(regex, targetBlock.trim());
    } else {
      console.log('Action: Adding ShareExtension target to Podfile');
      newContents += targetBlock;
    }

    // 2. Disable Privacy Manifest Aggregation (Fixes "Multiple commands produce" error)
    // (Removed: Handled via patch-package on React-Core.podspec)

    config.modResults.contents = newContents;

    config.modResults.contents = newContents;

    return config;
  });
};

module.exports = withShareExtensionPodfile;
