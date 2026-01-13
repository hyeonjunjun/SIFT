const { withPodfile } = require('@expo/config-plugins');

const withShareExtensionPodfile = (config) => {
    return withPodfile(config, (config) => {
        const targetBlock = `
target 'ShareExtension' do
  use_expo_modules!
  config = use_native_modules!
end
`;

        if (!config.modResults.contents.includes("target 'ShareExtension'")) {
            config.modResults.contents += targetBlock;
        }
        return config;
    });
};

module.exports = withShareExtensionPodfile;
