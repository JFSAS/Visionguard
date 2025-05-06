#!/usr/bin/env python
# Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved

import pickle as pkl
import sys
import torch

if __name__ == "__main__":
    input = sys.argv[1]
    obj = torch.load(input, map_location="cpu")
    print(obj.keys())
    obj = obj["teacher"]
    torch.save(obj,sys.argv[2])
