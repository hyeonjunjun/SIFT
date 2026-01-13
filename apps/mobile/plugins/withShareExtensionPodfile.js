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

    // 2. Inject post_install hook to set RCT_APP_EXTENSION macro (Fixes 'sharedApplication' error)
    const postInstallHook = `
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    # share_extension_macro: Apply RCT_APP_EXTENSION=1 to specified targets
    begin
      installer.pods_project.targets.each do |target|
        # 1. Apply to the ShareExtension target
        if target.name == 'ShareExtension'
          target.build_configurations.each do |config|
            config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
            unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('RCT_APP_EXTENSION=1')
              config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_APP_EXTENSION=1'
            end
            config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
            puts "[ShareExtension Fix] Applied RCT_APP_EXTENSION=1 to ShareExtension target"
          end
          
          # 2. Iterate dependencies to find React-Core
          target.dependencies.each do |dep|
            if dep.target && (dep.target.name.include?('React-Core') || dep.target.name.include?('React-'))
               puts "[ShareExtension Fix] Found dependency #{dep.target.name} for ShareExtension. Applying macro."
               dep.target.build_configurations.each do |config|
                 config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
                 unless config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].include?('RCT_APP_EXTENSION=1')
                   config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_APP_EXTENSION=1'
                 end
               end
            end
          end
        end
      end
    rescue => e
      puts "[ShareExtension Fix] Warning: Failed to apply macro: #{e.message}"
    end
`;

    // Regex to match the standard react_native_post_install call
    const postInstallRegex = /react_native_post_install\([\s\S]*?ccache_enabled\?\(podfile_properties\),\s*\)/;

    if (postInstallRegex.test(newContents)) {
      console.log('Action: Injecting RCT_APP_EXTENSION macro script');
      newContents = newContents.replace(postInstallRegex, postInstallHook.trim());
    }

    config.modResults.contents = newContents;

    return config;
  });
};

module.exports = withShareExtensionPodfile;
