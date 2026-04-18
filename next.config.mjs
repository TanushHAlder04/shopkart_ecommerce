/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    outputFileTracingIncludes: {
        '/*': ['./lib/generated/prisma/**/*']
    }
};

export default nextConfig;