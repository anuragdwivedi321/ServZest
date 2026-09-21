@echo off
title ServZest Development
pushd "%~dp0"
node scripts\dev.mjs
popd
pause
