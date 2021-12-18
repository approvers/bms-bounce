const config = {
  webpack: (config) => ({
    ...config,
    experiments: {
      asyncWebAssembly: true,
    },
  }),
};
module.exports = config;
