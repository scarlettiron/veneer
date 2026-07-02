//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

//Transpile the workspace packages so the example always uses the latest local code.
const nextConfig = {
  transpilePackages: ['@veneer/core', '@veneer/react', '@veneer/server', '@veneer/next'],
};

export default nextConfig;
