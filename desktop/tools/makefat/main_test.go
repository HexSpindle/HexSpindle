// SPDX-License-Identifier: MIT
package main

import (
	"bytes"
	"encoding/binary"
	"testing"
)

const (
	cpuX8664 = 0x01000007
	cpuARM64 = 0x0100000c
)

func thin(cpu, sub uint32, size int) []byte {
	b := make([]byte, size)
	binary.LittleEndian.PutUint32(b[0:], machO64)
	binary.LittleEndian.PutUint32(b[4:], cpu)
	binary.LittleEndian.PutUint32(b[8:], sub)
	for i := 32; i < size; i++ {
		b[i] = byte(i)
	}
	return b
}

func TestMakeFatLayout(t *testing.T) {
	amd, arm := thin(cpuX8664, 3, 40000), thin(cpuARM64, 0, 70001)
	fat, err := makeFat([][]byte{amd, arm})
	if err != nil {
		t.Fatal(err)
	}
	if binary.BigEndian.Uint32(fat) != fatMagic || binary.BigEndian.Uint32(fat[4:]) != 2 {
		t.Fatal("bad fat header")
	}
	for i, want := range [][]byte{amd, arm} {
		e := fat[8+20*i:]
		cpu, sub := binary.BigEndian.Uint32(e), binary.BigEndian.Uint32(e[4:])
		off, size, align := binary.BigEndian.Uint32(e[8:]), binary.BigEndian.Uint32(e[12:]), binary.BigEndian.Uint32(e[16:])
		if cpu != binary.LittleEndian.Uint32(want[4:]) || sub != binary.LittleEndian.Uint32(want[8:]) {
			t.Errorf("slice %d: cpu 0x%x/%d", i, cpu, sub)
		}
		if align != alignLog2 || off%(1<<alignLog2) != 0 || int(size) != len(want) {
			t.Errorf("slice %d: offset %d size %d align %d", i, off, size, align)
		}
		if !bytes.Equal(fat[off:off+size], want) {
			t.Errorf("slice %d: contents differ", i)
		}
	}
}

func TestMakeFatRejectsBadInput(t *testing.T) {
	cases := map[string][][]byte{
		"one input":     {thin(cpuARM64, 0, 64)},
		"duplicate cpu": {thin(cpuARM64, 0, 64), thin(cpuARM64, 0, 64)},
		"not mach-o":    {thin(cpuARM64, 0, 64), []byte("#!/bin/sh\necho not a binary\n")},
		"already fat":   {thin(cpuARM64, 0, 64), {0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}},
	}
	for name, inputs := range cases {
		if _, err := makeFat(inputs); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}
