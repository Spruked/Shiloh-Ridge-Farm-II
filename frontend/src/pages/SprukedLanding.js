/**
 * Copyright (c) 2025 Pro Prime Series LLC
 * All rights reserved. See www.spruked.com for details.
 */
import React from "react";

const SprukedLanding = () => (
  <main className="min-h-screen bg-gradient-to-br from-[#3d5a3d] to-[#2d4a2d] flex flex-col items-center justify-center px-6">
    <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-2xl text-center">
  <img src="/ShilohRidgeFarmicon256.png" alt="Shiloh Ridge Farm Icon" className="w-24 h-24 mx-auto mb-6" />
      <h1 className="text-4xl font-bold text-[#3d5a3d] mb-4">Welcome to Spruked</h1>
      <p className="text-lg text-gray-700 mb-4">Pro Prime Series LLC</p>
      <p className="text-gray-600 mb-6">Professional fullstack solutions for agriculture and livestock management. Our platform is designed to streamline operations, ensure compliance, and provide secure digital documentation for your business.</p>
      <a href="https://www.spruked.com" className="inline-block bg-[#3d5a3d] text-white font-semibold py-3 px-8 rounded-full text-lg hover:bg-[#2d4a2d] transition-colors" target="_blank" rel="noopener noreferrer">Visit spruked.com</a>
      <div className="mt-8 text-xs text-gray-400">&copy; 2025 Pro Prime Series LLC. All rights reserved.</div>
    </div>
  </main>
);

export default SprukedLanding;
