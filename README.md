# HCMC AI Challenge 2025

## Past Beggars

- Tran Nam Khanh
- Phan Le Dac Phu
- Duong Minh Loi
- Nguyen Ngoc Thien An
- Nguyen Truong Thinh


## Dependencies

1. Install [ffmpeg](https://ffmpeg.org/)

2. Install [tesseract](https://github.com/tesseract-ocr/tesseract)

3. Install [docker](https://www.docker.com/)

## Guideline

1. Install the repository

```bash
pip install git+https://github.com/trnKhanh/past-beggars.git
```

or

```bash
git clone https://github.com/trnKhanh/past-beggars.git
cd past-beggars
pip install -e .
```


2. Initialize workspace

```bash
mkdir workspace
cd workspace
aic51-cli init
```
- Change configuration in `config.yaml` (Optional)

3. Add videos to workspace

```bash
aic51-cli add <path/to/videos> -d -kc
```

3. Analyse videos

```bash
aic51-cli analyse
```

4. Index videos

```bash
aic51-cli index
```

5. Run webui

```bash
aic51-cli serve
```
