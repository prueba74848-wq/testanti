import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { createHash } from "crypto";

import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import alias from '@rollup/plugin-alias';

import { fileURLToPath } from 'url';
import { dirname, resolve, extname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

import swc from "@swc/core";

import os from "os";
import express from "express";

import { isProd } from "./config.js";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];
const PORT = 8000;

const stripVersions = (str) => str.replace(/\s?v\d+.\d+.\w+/, "");

const commonPlugins = [
	alias({
        entries: [
            { find: '~lib', replacement: resolve(__dirname, 'lib') },
        ],
    }),
	nodeResolve(),
	commonjs(),
	{
		name: "swc",
		async transform(code, id) {
			const ext = extname(id);
			if (!extensions.includes(ext)) return null;

			const ts = ext.includes("ts");
			const tsx = ts ? ext.endsWith("x") : undefined;
			const jsx = !ts ? ext.endsWith("x") : undefined;

			const result = await swc.transform(code, {
				filename: id,
