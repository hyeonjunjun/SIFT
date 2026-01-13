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

    // 3. Inject dependency-severing hook to stop React-Core_privacy target from building
    const postInstallHook = `
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    # severance_package: Remove dependencies on the privacy bundle target so it is never built
    begin
      installer.pods_project.targets.each do |target|
        # Inspect target dependencies
        target.dependencies.dup.each do |dep|
          if dep.target && dep.target.name.include?('React-Core_privacy')
            puts "[ShareExtension Fix] Removing dependency on #{dep.target.name} from #{target.name}"
            target.dependencies.delete(dep)
          end
        end
        
        # Also clean up resource build phases just in case
        if target.resource_build_phase
           target.resource_build_phase.files.each do |file|
             if file.display_name.include?('React-Core_privacy')
               puts "[ShareExtension Fix] Removing file ref #{file.display_name} from #{target.name}"
               target.resource_build_phase.remove_build_file(file)
             end
           end
        end
      end
    rescue => e
      puts "[ShareExtension Fix] Warning: Failed to sever dependencies: #{e.message}"
    end
`;

    // Regex to match the standard react_native_post_install call
    // Note: We used specific matching because simpler regex stops at nested 'ccache_enabled?(...)' parens
    const postInstallRegex = /react_native_post_install\([\s\S]*?ccache_enabled\?\(podfile_properties\),\s*\)/;

    if (postInstallRegex.test(newContents)) {
      console.log('Action: Injecting dependency-severing script for privacy bundle');
      newContents = newContents.replace(postInstallRegex, postInstallHook.trim());
    }

    config.modResults.contents = newContents;

    return config;
  });
};

module.exports = withShareExtensionPodfile;
