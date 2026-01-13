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
    // Replace the line enabling aggregation with false using a flexible regex
    const privacyRegex = /:privacy_file_aggregation_enabled\s*=>\s*.*?,/g;
    if (privacyRegex.test(newContents)) {
      console.log('Action: Disabling Privacy Manifest Aggregation in Podfile');
      newContents = newContents.replace(
        privacyRegex,
        ':privacy_file_aggregation_enabled => false,'
      );
    } else {
      console.log('Warning: Could not find privacy_file_aggregation_enabled setting to replace.');
    }

    // 3. Inject safe post_install hook to remove React-Core_privacy bundle
    const postInstallHook = `
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    # defensive_removal: Attempt to remove React-Core_privacy.bundle safely
    begin
      installer.pods_project.targets.each do |target|
        if target.name == 'React-Core'
          target.resource_build_phase.files.each do |file|
            if file.display_name == 'React-Core_privacy.bundle'
              target.resource_build_phase.remove_build_file(file)
              puts "[ShareExtension Fix] Successfully removed React-Core_privacy.bundle from React-Core target"
            end
          end
        end
      end
    rescue => e
      puts "[ShareExtension Fix] Warning: Failed to remove privacy bundle: #{e.message}"
    end
`;

    // Regex to match the standard react_native_post_install call
    // Note: We used specific matching because simpler regex stops at nested 'ccache_enabled?(...)' parens
    const postInstallRegex = /react_native_post_install\([\s\S]*?ccache_enabled\?\(podfile_properties\),\s*\)/;

    if (postInstallRegex.test(newContents)) {
      console.log('Action: Injecting defensive React-Core privacy bundle removal script');
      newContents = newContents.replace(postInstallRegex, postInstallHook.trim());
    }

    config.modResults.contents = newContents;

    return config;
  });
};

module.exports = withShareExtensionPodfile;
