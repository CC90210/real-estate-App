FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG COLMAP_VERSION=3.10
ARG GSPLAT_REF=main

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    GSPLAT_EXAMPLES_DIR=/opt/gsplat/examples

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    cmake \
    curl \
    git \
    gnupg \
    libboost-filesystem-dev \
    libboost-graph-dev \
    libboost-program-options-dev \
    libboost-system-dev \
    libcgal-dev \
    libceres-dev \
    libeigen3-dev \
    libflann-dev \
    libfreeimage-dev \
    libglew-dev \
    libgoogle-glog-dev \
    libgtest-dev \
    libmetis-dev \
    libsqlite3-dev \
    ninja-build \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3.11-distutils \
    && curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11 \
    && ln -sf /usr/bin/python3.11 /usr/local/bin/python \
    && ln -sf /usr/local/bin/pip3.11 /usr/local/bin/pip \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --branch "${COLMAP_VERSION}" --depth 1 https://github.com/colmap/colmap.git /tmp/colmap \
    && cmake -S /tmp/colmap -B /tmp/colmap/build -GNinja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/usr/local \
        -DGUI_ENABLED=OFF \
        -DCUDA_ENABLED=OFF \
        -DTESTS_ENABLED=OFF \
    && cmake --build /tmp/colmap/build --target install \
    && rm -rf /tmp/colmap

RUN git clone --branch "${GSPLAT_REF}" --depth 1 https://github.com/nerfstudio-project/gsplat.git /opt/gsplat

WORKDIR /workspace

COPY requirements.txt /workspace/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install -r /workspace/requirements.txt \
    && if [ -f /opt/gsplat/examples/requirements.txt ]; then \
        python -m pip install -r /opt/gsplat/examples/requirements.txt; \
    fi

COPY handler.py /workspace/handler.py
COPY pipeline /workspace/pipeline

CMD ["python", "-u", "handler.py"]
