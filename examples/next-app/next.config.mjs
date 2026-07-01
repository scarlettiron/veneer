//Transpile the workspace packages so the example always uses the latest local code.
const nextConfig = {
  transpilePackages: ['@veneer/core', '@veneer/react', '@veneer/server', '@veneer/next'],
};

export default nextConfig;
