import { Metadata } from 'next';
import React from 'react';
import Layout from '@/components/Layout';

export const metadata: Metadata = {
  title: 'Library - Perplexica',
};

const LibraryLayout = ({ children }: { children: React.ReactNode }) => {
  return <Layout>{children}</Layout>;
};

export default LibraryLayout;
