// SPDX-License-Identifier: MIT

// Command makefat joins thin Mach-O executables (for example the darwin/amd64 and darwin/arm64 Go builds) into
// one universal binary, with the same layout `lipo -create` produces, so the macOS app can be packaged on any OS.
//
//	go run ./tools/makefat -o HexSpindle HexSpindle-amd64 HexSpindle-arm64
package main

import (
	"encoding/binary"
	"errors"
	"flag"
	"fmt"
	"os"
)

const (
	fatMagic  = 0xcafebabe
	machO32   = 0xfeedface
	machO64   = 0xfeedfacf
	alignLog2 = 14 // 16 KiB, the page size lipo uses for arm64 (and accepted for x86_64)
)

type slice struct {
	cpuType, cpuSubtype uint32
	data                []byte
}

func readThin(data []byte) (slice, error) {
	if len(data) < 28 {
		return slice{}, errors.New("too short to be a Mach-O file")
	}
	magic := binary.LittleEndian.Uint32(data)
	if magic != machO64 && magic != machO32 {
		return slice{}, fmt.Errorf("not a little-endian thin Mach-O file (magic 0x%08x)", magic)
	}
	return slice{cpuType: binary.LittleEndian.Uint32(data[4:]), cpuSubtype: binary.LittleEndian.Uint32(data[8:]), data: data}, nil
}

func alignUp(n, a uint64) uint64 { return (n + a - 1) &^ (a - 1) }

func makeFat(inputs [][]byte) ([]byte, error) {
	if len(inputs) < 2 {
		return nil, errors.New("need at least two thin binaries")
	}
	slices := make([]slice, 0, len(inputs))
	seen := map[uint32]bool{}
	for i, in := range inputs {
		s, err := readThin(in)
		if err != nil {
			return nil, fmt.Errorf("input %d: %w", i+1, err)
		}
		if seen[s.cpuType] {
			return nil, fmt.Errorf("input %d: CPU type 0x%x appears twice", i+1, s.cpuType)
		}
		seen[s.cpuType] = true
		slices = append(slices, s)
	}
	align := uint64(1) << alignLog2
	offset := alignUp(uint64(8+20*len(slices)), align)
	header := make([]byte, 8+20*len(slices))
	binary.BigEndian.PutUint32(header[0:], fatMagic)
	binary.BigEndian.PutUint32(header[4:], uint32(len(slices)))
	offsets := make([]uint64, len(slices))
	for i, s := range slices {
		offsets[i] = offset
		if offset+uint64(len(s.data)) > 1<<32-1 {
			return nil, errors.New("universal binary would exceed 4 GiB")
		}
		e := header[8+20*i:]
		binary.BigEndian.PutUint32(e[0:], s.cpuType)
		binary.BigEndian.PutUint32(e[4:], s.cpuSubtype)
		binary.BigEndian.PutUint32(e[8:], uint32(offset))
		binary.BigEndian.PutUint32(e[12:], uint32(len(s.data)))
		binary.BigEndian.PutUint32(e[16:], alignLog2)
		offset = alignUp(offset+uint64(len(s.data)), align)
	}
	out := make([]byte, offsets[len(offsets)-1]+uint64(len(slices[len(slices)-1].data)))
	copy(out, header)
	for i, s := range slices {
		copy(out[offsets[i]:], s.data)
	}
	return out, nil
}

func main() {
	output := flag.String("o", "", "output universal binary")
	flag.Parse()
	if *output == "" || flag.NArg() < 2 {
		fmt.Fprintln(os.Stderr, "usage: makefat -o <output> <thin-binary> <thin-binary>...")
		os.Exit(2)
	}
	var inputs [][]byte
	for _, name := range flag.Args() {
		data, err := os.ReadFile(name)
		if err != nil {
			fmt.Fprintln(os.Stderr, "makefat:", err)
			os.Exit(1)
		}
		inputs = append(inputs, data)
	}
	fat, err := makeFat(inputs)
	if err == nil {
		err = os.WriteFile(*output, fat, 0o755)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "makefat:", err)
		os.Exit(1)
	}
	fmt.Printf("makefat: wrote %s (%d architectures, %d bytes)\n", *output, len(inputs), len(fat))
}
