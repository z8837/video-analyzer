OpenAI Codex v0.118.0 (research preview)
--------
workdir: C:\Users\tokeii\Desktop\mp4
model: gpt-5.4
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR, C:\Users\tokeii\.codex\memories]
reasoning effort: xhigh
reasoning summaries: none
session id: 019d6755-1844-7f33-bf7c-817105f9801f
--------
user
The current working directory is "C:\Users\tokeii\Desktop\mp4".
The selected source folder is "C:\Users\tokeii\Desktop\mp4\videos".
The selected source folder relative to the project root is "videos".
Read "C:\Users\tokeii\Desktop\mp4\analyze\_task.json" and analyze only the pending videos listed there.
Create only the markdown files listed in "C:\Users\tokeii\Desktop\mp4\analyze\_task.json".
Reuse count for this run: 0. Pending new analyses: 3.
Do not inspect unrelated repository files or scan the whole project.
Do not create or update analyze/results.json, analyze/index.md, preview videos, or permanent sample-sheet images.
Keep the workflow short: metadata plus a few representative frames per video are enough unless absolutely necessary.
On Windows, prefer UTF-8-safe reading and writing. Avoid shell commands that print Korean text through the default console encoding.
Your final response must be a short Korean summary in 5 lines or fewer.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
import json, pathlib
p = pathlib.Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_task.json')
with p.open('r', encoding='utf-8') as f:
    data = json.load(f)
print(json.dumps(data, ensure_ascii=True, indent=2))
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 281ms:
{
  "schemaVersion": 1,
  "generatedAt": "2026-04-07T09:45:23.130Z",
  "projectRootPath": "C:\\Users\\tokeii\\Desktop\\mp4",
  "sourceFolderPath": "C:\\Users\\tokeii\\Desktop\\mp4\\videos",
  "sourceFolderRelativePath": "videos",
  "totalFiles": 3,
  "reusableCount": 0,
  "pendingCount": 3,
  "pendingVideos": [
    {
      "fileName": "20230619_230408.mp4",
      "source": "videos/20230619_230408.mp4",
      "folderRelativePath": "videos",
      "outputMarkdown": "analyze/_library/videos/20230619_230408_mp4__videos.md"
    },
    {
      "fileName": "20230622_231747.mp4",
      "source": "videos/20230622_231747.mp4",
      "folderRelativePath": "videos",
      "outputMarkdown": "analyze/_library/videos/20230622_231747_mp4__videos.md"
    },
    {
      "fileName": "20230626_132021.mp4",
      "source": "videos/20230626_132021.mp4",
      "folderRelativePath": "videos",
      "outputMarkdown": "analyze/_library/videos/20230626_132021_mp4__videos.md"
    }
  ]
}
mcp: codex/list_mcp_resources started
mcp: codex/list_mcp_resources (completed)
mcp: codex/list_mcp_resource_templates started
mcp: codex/list_mcp_resource_templates (completed)
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
mods = ['cv2','PIL','torch','transformers','open_clip','clip','lavis']
for m in mods:
    try:
        __import__(m)
        print(m+':YES')
    except Exception:
        print(m+':NO')
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 276ms:
cv2:NO
PIL:NO
torch:NO
transformers:NO
open_clip:NO
clip:NO
lavis:NO
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "ffprobe -v error -print_format json -show_streams -show_format \"C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230619_230408.mp4\"" in C:\Users\tokeii\Desktop\mp4
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "ffprobe -v error -print_format json -show_streams -show_format \"C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230622_231747.mp4\"" in C:\Users\tokeii\Desktop\mp4
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "ffprobe -v error -print_format json -show_streams -show_format \"C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230626_132021.mp4\"" in C:\Users\tokeii\Desktop\mp4
 succeeded in 358ms:
{
    "streams": [
        {
            "index": 0,
            "codec_name": "h264",
            "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
            "profile": "High",
            "codec_type": "video",
            "codec_tag_string": "avc1",
            "codec_tag": "0x31637661",
            "width": 3840,
            "height": 2160,
            "coded_width": 3840,
            "coded_height": 2160,
            "closed_captions": 0,
            "film_grain": 0,
            "has_b_frames": 0,
            "pix_fmt": "yuv420p",
            "level": 51,
            "color_range": "tv",
            "color_space": "bt709",
            "color_transfer": "bt709",
            "color_primaries": "bt709",
            "chroma_location": "left",
            "field_order": "progressive",
            "refs": 1,
            "is_avc": "true",
            "nal_length_size": "4",
            "id": "0x1",
            "r_frame_rate": "30/1",
            "avg_frame_rate": "27180000/905687",
            "time_base": "1/90000",
            "start_pts": 0,
            "start_time": "0.000000",
            "duration_ts": 905687,
            "duration": "10.063189",
            "bit_rate": "47756627",
            "bits_per_raw_sample": "8",
            "nb_frames": "302",
            "extradata_size": 33,
            "disposition": {
                "default": 1,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0,
                "multilayer": 0
            },
            "tags": {
                "creation_time": "2023-06-26T04:20:32.000000Z",
                "language": "eng",
                "handler_name": "VideoHandle",
                "vendor_id": "[0][0][0][0]"
            },
            "side_data_list": [
                {
                    "side_data_type": "Display Matrix",
                    "displaymatrix": "\n00000000:            0       65536           0\n00000001:       -65536           0           0\n00000002:            0           0  1073741824\n",
                    "rotation": -90
                }
            ]
        },
        {
            "index": 1,
            "codec_name": "aac",
            "codec_long_name": "AAC (Advanced Audio Coding)",
            "profile": "LC",
            "codec_type": "audio",
            "codec_tag_string": "mp4a",
            "codec_tag": "0x6134706d",
            "sample_fmt": "fltp",
            "sample_rate": "48000",
            "channels": 2,
            "channel_layout": "stereo",
            "bits_per_sample": 0,
            "initial_padding": 0,
            "id": "0x2",
            "r_frame_rate": "0/0",
            "avg_frame_rate": "0/0",
            "time_base": "1/48000",
            "start_pts": 830,
            "start_time": "0.017292",
            "duration_ts": 482296,
            "duration": "10.047833",
            "bit_rate": "256069",
            "nb_frames": "471",
            "extradata_size": 2,
            "disposition": {
                "default": 1,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0,
                "multilayer": 0
            },
            "tags": {
                "creation_time": "2023-06-26T04:20:32.000000Z",
                "language": "eng",
                "handler_name": "SoundHandle",
                "vendor_id": "[0][0][0][0]"
            }
        }
    ],
    "format": {
        "filename": "C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230626_132021.mp4",
        "nb_streams": 2,
        "nb_programs": 0,
        "nb_stream_groups": 0,
        "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
        "format_long_name": "QuickTime / MOV",
        "start_time": "0.000000",
        "duration": "10.065125",
        "size": "60400254",
        "bit_rate": "48007554",
        "probe_score": 100,
        "tags": {
            "major_brand": "mp42",
            "minor_version": "0",
            "compatible_brands": "isommp42",
            "creation_time": "2023-06-26T04:20:32.000000Z",
            "com.android.version": "12",
            "com.android.capture.fps": "30.000000"
        }
    }
}
 succeeded in 470ms:
{
    "streams": [
        {
            "index": 0,
            "codec_name": "h264",
            "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
            "profile": "High",
            "codec_type": "video",
            "codec_tag_string": "avc1",
            "codec_tag": "0x31637661",
            "width": 3840,
            "height": 2160,
            "coded_width": 3840,
            "coded_height": 2160,
            "closed_captions": 0,
            "film_grain": 0,
            "has_b_frames": 0,
            "pix_fmt": "yuv420p",
            "level": 52,
            "color_range": "tv",
            "color_space": "bt709",
            "color_transfer": "bt709",
            "color_primaries": "bt709",
            "chroma_location": "left",
            "field_order": "progressive",
            "refs": 1,
            "is_avc": "true",
            "nal_length_size": "4",
            "id": "0x1",
            "r_frame_rate": "60000/1001",
            "avg_frame_rate": "5010000/84581",
            "time_base": "1/90000",
            "start_pts": 0,
            "start_time": "0.000000",
            "duration_ts": 253743,
            "duration": "2.819367",
            "bit_rate": "69865495",
            "bits_per_raw_sample": "8",
            "nb_frames": "167",
            "extradata_size": 33,
            "disposition": {
                "default": 1,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0,
                "multilayer": 0
            },
            "tags": {
                "creation_time": "2023-06-22T14:17:50.000000Z",
                "language": "eng",
                "handler_name": "VideoHandle",
                "vendor_id": "[0][0][0][0]"
            },
            "side_data_list": [
                {
                    "side_data_type": "Display Matrix",
                    "displaymatrix": "\n00000000:            0       65536           0\n00000001:       -65536           0           0\n00000002:            0           0  1073741824\n",
                    "rotation": -90
                }
            ]
        },
        {
            "index": 1,
            "codec_name": "aac",
            "codec_long_name": "AAC (Advanced Audio Coding)",
            "profile": "LC",
            "codec_type": "audio",
            "codec_tag_string": "mp4a",
            "codec_tag": "0x6134706d",
            "sample_fmt": "fltp",
            "sample_rate": "48000",
            "channels": 2,
            "channel_layout": "stereo",
            "bits_per_sample": 0,
            "initial_padding": 0,
            "id": "0x2",
            "r_frame_rate": "0/0",
            "avg_frame_rate": "0/0",
            "time_base": "1/48000",
            "start_pts": 1742,
            "start_time": "0.036292",
            "duration_ts": 130046,
            "duration": "2.709292",
            "bit_rate": "256261",
            "nb_frames": "127",
            "extradata_size": 2,
            "disposition": {
                "default": 1,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0,
                "multilayer": 0
            },
            "tags": {
                "creation_time": "2023-06-22T14:17:50.000000Z",
                "language": "eng",
                "handler_name": "SoundHandle",
                "vendor_id": "[0][0][0][0]"
            }
        }
    ],
    "format": {
        "filename": "C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230622_231747.mp4",
        "nb_streams": 2,
        "nb_programs": 0,
        "nb_stream_groups": 0,
        "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
        "format_long_name": "QuickTime / MOV",
        "start_time": "0.000000",
        "duration": "2.819367",
        "size": "24712654",
        "bit_rate": "70122560",
        "probe_score": 100,
        "tags": {
            "major_brand": "mp42",
            "minor_version": "0",
            "compatible_brands": "isommp42",
            "creation_time": "2023-06-22T14:17:50.000000Z",
            "com.android.version": "12",
            "com.android.capture.fps": "60.000000"
        }
    }
}
 succeeded in 475ms:
{
    "streams": [
        {
            "index": 0,
            "codec_name": "h264",
            "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
            "profile": "High",
            "codec_type": "video",
            "codec_tag_string": "avc1",
            "codec_tag": "0x31637661",
            "width": 3840,
            "height": 2160,
            "coded_width": 3840,
            "coded_height": 2160,
            "closed_captions": 0,
            "film_grain": 0,
            "has_b_frames": 0,
            "pix_fmt": "yuv420p",
            "level": 52,
            "color_range": "tv",
            "color_space": "bt709",
            "color_transfer": "bt709",
            "color_primaries": "bt709",
            "chroma_location": "left",
            "field_order": "progressive",
            "refs": 1,
            "is_avc": "true",
            "nal_length_size": "4",
            "id": "0x1",
            "r_frame_rate": "60000/1001",
            "avg_frame_rate": "5490000/93091",
            "time_base": "1/90000",
            "start_pts": 0,
            "start_time": "0.000000",
            "duration_ts": 186181,
            "duration": "2.068678",
            "bit_rate": "70578918",
            "bits_per_raw_sample": "8",
            "nb_frames": "122",
            "extradata_size": 33,
            "disposition": {
                "default": 1,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0,
                "multilayer": 0
            },
            "tags": {
                "creation_time": "2023-06-19T14:04:11.000000Z",
                "language": "eng",
                "handler_name": "VideoHandle",
                "vendor_id": "[0][0][0][0]"
            },
            "side_data_list": [
                {
                    "side_data_type": "Display Matrix",
                    "displaymatrix": "\n00000000:            0       65536           0\n00000001:       -65536           0           0\n00000002:            0           0  1073741824\n",
                    "rotation": -90
                }
            ]
        },
        {
            "index": 1,
            "codec_name": "aac",
            "codec_long_name": "AAC (Advanced Audio Coding)",
            "codec_type": "audio",
            "codec_tag_string": "mp4a",
            "codec_tag": "0x6134706d",
            "sample_fmt": "fltp",
            "sample_rate": "48000",
            "channels": 2,
            "channel_layout": "stereo",
            "bits_per_sample": 0,
            "initial_padding": 0,
            "id": "0x2",
            "r_frame_rate": "0/0",
            "avg_frame_rate": "0/0",
            "time_base": "1/48000",
            "start_pts": 1354,
            "start_time": "0.028208",
            "duration_ts": 95231,
            "duration": "1.983979",
            "bit_rate": "256494",
            "nb_frames": "93",
            "extradata_size": 2,
            "disposition": {
                "default": 1,
                "dub": 0,
                "original": 0,
                "comment": 0,
                "lyrics": 0,
                "karaoke": 0,
                "forced": 0,
                "hearing_impaired": 0,
                "visual_impaired": 0,
                "clean_effects": 0,
                "attached_pic": 0,
                "timed_thumbnails": 0,
                "non_diegetic": 0,
                "captions": 0,
                "descriptions": 0,
                "metadata": 0,
                "dependent": 0,
                "still_image": 0,
                "multilayer": 0
            },
            "tags": {
                "creation_time": "2023-06-19T14:04:11.000000Z",
                "language": "eng",
                "handler_name": "SoundHandle",
                "vendor_id": "[0][0][0][0]"
            }
        }
    ],
    "format": {
        "filename": "C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230619_230408.mp4",
        "nb_streams": 2,
        "nb_programs": 0,
        "nb_stream_groups": 0,
        "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
        "format_long_name": "QuickTime / MOV",
        "start_time": "0.000000",
        "duration": "2.068678",
        "size": "18317376",
        "bit_rate": "70837031",
        "probe_score": 100,
        "tags": {
            "major_brand": "mp42",
            "minor_version": "0",
            "compatible_brands": "isommp42",
            "creation_time": "2023-06-19T14:04:11.000000Z",
            "com.android.version": "12",
            "com.android.capture.fps": "60.000000"
        }
    }
}
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$tmp = Join-Path $env:TEMP '"'codex_video_frames'; New-Item -ItemType Directory -Force -Path "'$tmp | Out-Null; ffmpeg -y -ss 0.5 -i "C:'"\\Users\\tokeii\\Desktop\\mp4\\videos\\20230619_230408.mp4\" -frames:v 1 -vf \"scale=80:-1,format=gray\" \""'$tmp'"\\frame1.pgm\" -loglevel error" in C:\Users\tokeii\Desktop\mp4
 succeeded in 708ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
p = Path(__import__('os').environ['TEMP']) / 'codex_video_frames' / 'frame1.pgm'
with p.open('rb') as f:
    magic = f.readline().strip()
    if magic "'!= b'"'P5':
        raise SystemExit(f'bad magic {magic"'!r}'"')
    line = f.readline()
    while line.startswith(b'#'):
        line = f.readline()
    w,h = map(int, line.split())
    maxv = int(f.readline())
    data = f.read()
chars = ' .:-=+*#%@'
for y in range(h):
    row = data[y*w:(y+1)*w]
    print(''.join(chars[p*(len(chars)-1)//maxv] for p in row))
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 323ms:
------------======================---=================================++++++++++
----------------------============----====================================+++++=
-:----------------------==========---=======================--==-============++=
::-----------------------=========---=================================---====++=
-------------------------========----================================-----======
-------------------------========---=================================-------====
--------------------------======----=================================--------===
--------------------------=---------========---======================-----------
--------------------------==--------==================================----------
.::----------------------=====------==========================-----======-------
...::-----==------------=-=====-----====================---:::::::::-----===----
.::..::---====-----------======-----==================-::::::::::::::::::---===-
:::::..::-======----------===-=------================-::::::::::::::::::------==
::::::..::-=====---------=---=-------==============-:::::::::::::::::---===-----
:::::::::::-=======-----===--==-------============-:::::::::::::::----=======-:-
::::::::::.:============---===--------===========-::::::::::::::::----========-:
:::::::::...:=++++=======--====-------==========-:::::::::::::::--------===-==--
::::::::::...:=++++++=====------------=========-::::::::::::::----=-========----
::::::::::::..:=+++++++====---=-------=========-::::::::::::-----------=====----
:::::::::::::..:+++++++++===--=-------========-::::::::::::-:::::::::::--------:
..........:::...-+++++**+++==----------=======-:::::::::::::::::::....:::::---::
         ........=++++++**+++==-------=======-:::::::::::::.............::::::::
  .          ....-++++++++***++=------=======-:::::::::::..        ........:::::
....           ..:=+++++++++***++=-----======::::::::::..          :-::......:::
::-:             .-======+++++****+=----====-::::::::...          .---::........
----:          .  :=======++++++***++=======-:::::::. ..      ....:---:.........
::---.        ..  :========+++++++***++=-===-::::::.  ...    ...::---::.........
..::-:.       .   :=============++++***+=====-:::::.  ...       .--::::::::.....
........ .........:======-------==+++***+====-:::::.............:::::::::-::::..
........::::::::::-====-----------==++***=====::::::::::::::::::::::-------:::::
::::::::::::::::::-===-----------====++**+++==-:::::::::--------------------::::
::::::::::::::::::-==------:---=======++**+====-::::::::----------------------::
----::::::::::::::=------------==+++==+++**++++=-:::::::----------------------::
--:::::::::::::::-=-----------==++**+==++**+++++=-:::::::---------------------::
:::::::::::::::::---:---------==++***+++++**+++++=-:::::::--------------------::
:::::::::::::::::--::::-----====++**##*+++**++++++==-::::::-------------------::
::::::::::::::::--::::::---=+++==++*****+++*++++++++==--:::::-----------------::
:::::::::::::::---:::::----++++=++++**##*++*++++++++++===--:::------------------
:::::::::::::-----:::::---=++++++++***##*++*++++++++++++++==-----==============-
::::::::::::-----:::::---=++*+++++****%#++++++++==+++++++++====================-
:::::::::::-------:::----=+**+++++****##*++++++=-==++++++++====================-
::::::::----------:::---=++**++++*****##*++++++=:====+++++++++=================-
:::::::-----------::----=+**+++++*****%#**+*+++-:-====+++++++++++==============-
:::::-------------::---=++**+++++****#%#******+=-======+++++++++++++============
::::--------------::---++**++++++****#%#******+=-======++++++++++++++=+=========
::----------------::--=++**++++++****#%#******==-==++++++++++++++++++++++=======
-::--------------::---++***++++++****#%#******==--=+++++++++++++++++++++++++====
--:--------------::--=+***+++++++****#%#******==--==++++++++++++++++++++++++++==
--::-----------::::-=++**++++=+++****#@%******==--=====++++++++++++++++++++++===
---::---------:::::-=+***++++=++*****#@%#*****==--======++++++++++++++++++++====
----::--------:::::=+***++++==++*****#%%#*****===--======++++++++++++++++++=====
------:-------::::-=+**++++===+++****#%@#*****===-:========++++++++++++++++=====
------:-------::::=+***+++====+++****##%#*****+==-:-========+++++++++++++++=====
-------------::::-+****+++====+++*****#####***+==-::=++====+++++++++++++++======
--------:---:::::=+***+++=====++++*******##***+++=::=++++++++++++++++===========
-------:::-:::::-+****+++=====++++************++++-:-++++++++++++++++======+====
-------:::::::::=*****++======++++************++++=::=++++++==++++++============
==----:::::::::-+*****++==-====+++*************++++-.:+++++++========++++++=====
=====-:::::::::=*****+++==--===+++*************++++=.:++++===========+++++++===-
======-::::::::+*****+++==--===++****##*###***+++++=:-++++=========+++++++++====
===--===-:::::=******+++======+++****########*+++++=-==++==========++++++++++===
===---===-::::+*****++++======+++*****#######*+++++=-+=============+++++++++====
===----===-::-+*****++++=====++++****#########+++++==+=============+++++++++===-
==-----====-::-=++*+++++====+++++****#########++++==+=============++++++++++===-
-----------==-:::==+++++===+++++*****#########*=====+==-=========++++++++++====-
-------------=-:.:---====+++++++*****#########*=======--========+++++++++++====-
--------=--------::::----====+++*****#########+======----=======+++++++++++====-
--------===--------::::::::----==+++***#######+--===-----=======+++++++++++====:
:-------===-----------::...::::------==++*****+--==------=======++++++++++====:.
.--------==--------------:::---------------====-==---------==================-:.
 :-------==-------------------------------------=======-----=================-: 
 .---------------------------------------------=========-===================--. 
  -------------------------------------------==++++=========================-:. 
  :=----------------------------------------==++++++========================-:  
  .--------------------------------------===++++++++=======================-:.  
.  -=----------------------------===---====++++++++++++===================--.   
:  .=---------------------------==========++++++++++++++==================-:    
-   -=--------------------------=========++++++++++++++==================--.    
=:  .=-----=---------------------=======++++++++++++++===================-:     
--.  ----------------------------=======++++++++++++++==========++======-:.     
-=:  .--------------------------========++++++++++=================-===--.      
.-=.  ------------------:-:-------------========----------========--==--:.      
 :=-  :---------------------:----------------=--=-----------======--==-:.       
 .--.  --------::::----::::::::--------::-------------------======--=-::.       
 .=-:  .-----::....::::::::::::::---:::::::::::---:::::-----======-==-:.        
 .==-.  ----::::.::...:::::::::::--:::::::::::::::.....:----=====--=-:.         
  -==:  :----::::::::.::::::::::::-:::::::::............:-=======-==-..         
  .==-. .-----::::::::::::::::::::::::::::::::::.::::..:-=-========-:.          
   -==:  :=--=-:::::--::::::::::::::::::::::::::::::::-==--=======-:            
    -=-. .-=-===-:::----:::::::::::::::--------------====---====--:.            
     -=-  :=---==--::-----::::::::::---------------======----==---.             
      :-. .-----===--:--------:::------------=---========-------:.              
           -=-----------------------------------========--------.               
           .=---------------------------------=========--------:                
            -=-------------------------------=========--------.                 
            .-=----=----------::::::::-----==-======---------.                  
             .-=------------------------===----==-=---------.                   
              .-=-----------------------===========-------:.                    
               .-=--------------------==============-----:                      
                .==-----------------================----.                       
                 :===-------------========+++++======--.                        
                  :===-----------=======+++++++=====-:                          
                   :==--------=--=======++++++=====-:                           
                   .:====-------=========++++=====-.                            
                  ...:====-------===============--.                             
                ......:-==-==----==============-:.                              
                ......::-=========--=======----:                                
          ..    .::..:::::-============------:..                              .:
          :...  .::::::::::---========-----:...                                 
  .       .-::....--:::::::::------------:::::.                                 
 ..        :::..:.:-:::::::::---------:::::::.                                  
  :         ::. :::--:::-:::----------:::::::..                                 
            .-. .::---:----:-------------:::: .                                .
   .         .:....:---:---:-------------:::...                                .
  .        ...:.....-=-:---::------------:::..                                 :
 :-. .    .:::......:-=----::------------::..  ..                              .
..-:  .   .:::.....:::=---:::-------------:..  :.                               
: -:      .:-::....:::-=:::--------------::.  .::                               
-: . :.    :::-:....:.:=-:::--------------:.  :::                               
--:  . ..  ...-::...::--=-:::--------------.  :-:                               
.--.   :::  .::--:...------:::-------------:  ::                                
 .-.  . .-.  :---:. .:------------------:--:  :::       .                       
-:.   -.:..   .:.... .:-----------------::::  :-:       ..                      
:--  :.:----::.:::::. .-----------------:---. :::       .                       
:-: .-.-------------:. :--------------------: .::              .                
-. ..::--------------:  :--------------------..::        ..    .                
. .-..----------------: .:-------------------: ::.    .  ::.                    
 .-::------------------: .-------------------- ::.       .::                    
:-:::-------------------: .-------------------..:.  ..   ....                   
-::::--------------------: .------------------:.:.  ..   .:::.                  
-:::.:--------------------:.:------------------..:  .  .  .::-:                 
--::..:--------------------:.:------------------.:  ... . :----.        .       
---:-.:---------------------:.:-----------------:.  ..:.. .----:       ..       
-----:.:---------------------:.:-----------------:  ..:... :--:::..   ..        
::---..::---------------------:::-------------:---. :.:-..  :::-::.             
::---..::----------------------::-----------------. ::---..  .---:.             
::---:..::----------------------:-----------------: ::---: : .:-::.             
::----:.::-----------------------------------------  :----... .:::           .  
:---:--.::-----------------------:-----------------. .:----. . .:.          ..  
:---::-::::----------------------:-----------------: ...:---.....            .  
---::::::::----------------------:------------------. ::...::.       .          
--:.:-::::::----------------------:-----------------: .:-:.         . ...
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
import os, subprocess, math, json
from pathlib import Path
videos = [
    r'C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230619_230408.mp4',
    r'C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230622_231747.mp4',
    r'C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230626_132021.mp4',
]
outdir = Path(os.environ['TEMP']) / 'codex_video_frames2'
outdir.mkdir(exist_ok=True)
# durations known approximately
for video in videos:
    base = Path(video).stem
    # get duration via ffprobe
    info = subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',video], text=True).strip()
    dur = float(info)
    times = [max(0.0, dur*x) for x in [0.05,0.35,0.65,0.95]]
    for i,t in enumerate(times,1):
        out = outdir / f'{base}_{i}.ppm'
        subprocess.run(['ffmpeg','-y','-ss',f'{t:.3f}','-i',video,'-frames:v','1','-vf','scale=60:-1',str(out),'-loglevel','error'], check=True)
print(str(outdir))
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 4727ms:
C:\Users\tokeii\AppData\Local\Temp\codex_video_frames2
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
import math, os
outdir = Path(os.environ['TEMP']) / 'codex_video_frames2'
chars = ' .:-=+*#%@'

def read_ppm(path):
    with open(path,'rb') as f:
        magic = f.readline().strip()
        if magic "'!= b'"'P6':
            raise SystemExit(f'bad magic {magic"'!r} for {path}'"')
        def next_token():
            tok = b''
            while True:
                ch = f.read(1)
                if not ch:
                    return tok
                if ch == b'#':
                    f.readline()
                    continue
                if ch.isspace():
                    if tok:
                        return tok
                    continue
                tok += ch
        w = int(next_token()); h = int(next_token()); maxv = int(next_token())
        data = f.read(w*h*3)
    return w,h,maxv,data

for base in ['20230619_230408','20230622_231747','20230626_132021']:
    print('====', base, '====')
    for i in range(1,5):
        p = outdir / f'{base}_{i}.ppm'
        w,h,maxv,data = read_ppm(p)
        print('--', i, w, h, '--')
        # downsample vertically for console
        rows = []
        for y in range(0,h,2):
            line=''
            for x in range(w):
                idx=(y*w+x)*3
                r,g,b = data[idx:idx+3]
                lum = int(0.299*r+0.587*g+0.114*b)
                line += chars[lum*(len(chars)-1)//255]
            rows.append(line)
        print('\\n'.join(rows[:60]))
        # basic stats
        rs=[]; gs=[]; bs=[]
        for j in range(0,len(data),3):
            rs.append(data[j]); gs.append(data[j+1]); bs.append(data[j+2])
        print('avg_rgb', round(sum(rs)/len(rs),1), round(sum(gs)/len(gs),1), round(sum(bs)/len(bs),1))
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 333ms:
==== 20230619_230408 ====
-- 1 60 107 --
----------=============--------===================++++++====
::::::-----------=======-----=============------============
::------------------====----===----======--------------=====
---------------------------------------===-=====------------
::--------------------------==------========----------------
.::.::-==-------------------===========-::::::::::::::----=-
::::::..-====----------------========-:::::::::::---=====-::
::::::::..-++++===-----------======-::::::::::------=====--:
::::::::::..=++++++==--------=====-:::::::::::::.....:::-:::
:::::::::....-++++++*++=------===-::::::::..       ::....:::
.....        .======++++*+==--===-:::::..::     . :--:......
.::---.       -==========++**+===-::::. ..::.  .:---:-:.....
............::==----------=++*+++==::::::::::::----------:::
:::::::::::::----------=+++==++*+++=-:::::----------------::
:-::::::::::--:::----===++***++++++++==--:::--------------::
::::::::::----:::---++++++**##++++++++++++++==============--
::::::::------::---++++++***##*++++--===++++++============--
::::----------:--=+++++++***%#****+--=====+++++++++=========
-:-----------::-=++++++++**#%#****+=-==+=+++++++++++++++++==
---:-------:::-=+*+++=++****%%****==--=====+++++++++++++===-
-----:-----:::=+*+++==+++***#%#***+=-:-======++++++++++=====
------:---:::=**+++====++*********+++-:=++++++++++==========
=----:::::::=***++=--==+++*********+++-.=+++=========+=====-
===-=--::::=***+++==-==++***#####*++++=-==+========+++++===-
==----==-:-+**++++====+++***######*+++=+==========++++++===-
------------::--====++++*****#####*=====--======++++++++===:
-------=---------:..:::---===++***+-==-----=======++++====-.
-----------------------------------======---=============-: 
 -------------------------------==+++++=================-:  
 .-----------------------==-===++++++++++==============-:   
  .----------------------=====++++++++++========+=====-.    
   .=--------------------------===----------=====--=-:.     
 .. :-----::..::::::::::---::::::::--::::----====-=-:.      
  -: :=---:::::::::::::::::::::::::::::..:----==-=-.        
   .. :==--=--::---::::::::------------===-------:          
       .-=--------------------------======-----:.           
         .-------------::::::-----====-------:              
           .-=---------------==========----:                
             .==----------=======++====--.                  
               :===-------=====+++===-:                     
              ...:-=====---=======--.                       
       .:..:. .::::::--=--==----::..                        
 ..     ::.:-..::::::--------:::::.                        .
         .:..-::---------------::..                        .
..-.    .:.. .=-::-:::---------::. .:                       
--. . .  ..:..:=-:::------------:  ::                       
..:  .... .:: .:----::--------:::..::     .                 
:-. :.--------. ------------------ ::          .            
. :::----------: :----------------:.:.     .:               
-::::------------..----------------:.. .   .:::             
----::------------:.----------------:. .... :--:.    .      
::--..:-------------.:---------------- .:-:.. :-::          
::---:.:-------------::---------------: .---.  .:.       .. 
:-:.:::::------------------------------: :.....    .        
avg_rgb 98.2 87.5 83.6
-- 2 60 107 --
::::-------------========----==============------=========+=
:-------------------=====---=====--========-------------====
----------------------------------------==========---------=
.:--------------------------====------========--------------
.::..:-==-------------------============-:::::::::::::::----
:::::::.-=====---------------========--::::::::::::--=====-:
:::::::...-++++====-----------======-::::::::::-----=====---
::::::::::..-++++++==---------=====::::::::::::::::..::----:
          ...-++++++*++=-------===-::::::::..       .....:::
:---.        .======++++**+=-=-==-::::::..:.    .  --:......
.:----.      .-======--==+++*+===-:::::...::.   .:--::......
.......:::::::==----------==++*++==:::::::::::::::::-----:::
:::::::::::::----------==++==++*++++=:::::----------------::
::::::::::::--:::::--====+***++++++++==--::::--------------:
::::::::::----::::--+++++++**#*++++++++++++==---------=-=---
::::::::------::---+++++++***#*+++++-===+++++==============-
:::::---------:---+++++++***##**+++=-=====+++++++++=========
::-----------::-=++++++++***##****+=-==+++++++++++++++======
--:---------::-=+++++==++***#%#***+=--====++++++++++++++++==
----:------:::=+++++===++***#%#***+==--======+++++++++++====
----------:::=+*+++====+++********+=+-:=+++=++++++++========
-----:::::::=***++==-==+++*********+++-.=++++===============
====-::::::=***+++==-===+**********++++:-++==========++++===
==---==-::=***++++=====++****#####*+++=============+++++====
-----------::-=+++==+++++****######+=====-========++++++===-
---------------:::::---==++***#####=-==----======+++++++===-
------------------------------------====-----=============-.
----------------------------------=+++===================-: 
:-----------------------------===++++++==============-==-:  
 :-----------------------======+++++++++===========-===-.   
  ----------------------=======+++++==============-==--.    
   -=------:::----:::::----------------------====----:.     
    -=---::::::..::::::::--:::::::.......::--====---.       
    .==----::::--::::::::::::::::::::::::-=--=====:         
     .-=----=--:----------------------====-------.          
        -=-------------------------======------.            
          :=-------------------=---=---------.              
            :=--------------===========---:                 
             .-=----------=====++++====-.                   
              ..-==--------=========-:                      
        ..    ..:::-====-=-==-----:.                       .
 .     .:::.  ::::::::---------:::.                         
         ::-:..:-------------:-::..                         
 :  .   ..::-.:::--------------::.                         .
:.. .   :::.:=::::::-----------:. .:.                       
:-.  ::  .:-.:=:--:::-----------: .:                        
-:  ::-:......:---------------:-- .-:     .                 
: ..:----------.:----------------: ::      .   .            
:-::------------:::---------------:.:      ::.              
-::.:-------------:.---------------:.. . ...:--.            
----.:--------------.:--------------:. .::. :-:::.   .      
:---..:--------------:::--------------.::-:.. :-:.          
:--:-:::------------------------------: .:--:....        .  
--::-::::------------------------------..:::.      ...      
avg_rgb 98.7 87.2 83.2
-- 3 60 107 --
:-------------------======---=====--========------=========+
----------------------------------------============------==
.::-------------------------===--------===============-----=
::::.:--==-------------------============--::::::::::::---==
::......:====----------------==========-:::::::::::::-====--
::::::::..-++++====-----------=======-:::::::::---::::--===-
   .     ...-++++++==---------=====-::::::::::.   ..:.. .::-
:--:        .-++++++++==------=====::::::::.        :--:. .:
---:         .-=====+++**+=----===-::::::.::        ---:.. .
-----.      . :========++++*++=-==-:::::.:--. ...:.:=--::...
..:::-:.  ....-==---------=++**+===:::::...::....:------::::
:.....::::::::----------=====++*+===-:::::::---------------:
:::::::::::::----------==+**++++*+++==-:::::--------------::
:::::::::::---::::---=++=++****++++++++++=--::-------------:
:::::::::----::::---++++++***#*+++++==++++++++=============-
::::::--------::---+++++++***##*++++--===+++++++============
:::-----------:--=++++++++**#%#****+--=====+++++++++========
-:-----------::-=++++++++***#%#****+=-==+=+++++++++++++=====
---:-------::::=+*+++==++****%%****==--=====++++++++++++++==
-----:-----:::=+*+++===+++***##****+=-:-======++++++++++====
------:--::::=**+++====+++*********+++-:=+++++++++++========
=----:::::::=***+++=--==++**********+++::++++===============
===-==-::::=***+++=====++****#####*++++=-=+==========++++===
==----==-::=++++++====+++****######++++=+==========+++++====
------------:::--====++++****######*=====--=======+++++++==-
-------=---------:..::::-----==++**+-==-----=====+++++++===-
:-----------------------------------======----============-.
 :-------------------------------==++++==================-: 
  -=---------------------==--===++++++++++==============-:  
:  ----------------------======++++++++++==============-.   
.:  -----------------------==========------=======--=--.    
 -: .------::.:--:::::::-----::::-------------====---:.     
 .=: .----::::::.::::::::--:::::::........:---===-=-.       
   =: :=--=-:::---::::::::::::--------::-==--====-:         
    .  :=----=-----------------------======------.      .   
        .-=------------------------=====-------.            
           -=---------------------==--------:               
            .-=-------------===========---.                 
              :==--------======++++====:                    
              ..:-=-=-----==========-.                      
       ..  .  ..::::-=====-==----::.                       .
 .      ::.:-.:::::::---------::::.                         
         :: :-::-------------:-::.                          
 -: .   ::...--:::---:---------::.  .                  .   .
-.. .   :::...:=::::-----------:.  :.                 .     
.-:  .:. .:-:..-=---::--------:-: .:                        
:-..::---:::::. :-------------:--..::     .                 
. :.:----------: .----------------.::      .                
--::-------------..:--------------:.:. .   .:.              
--:.:-------------:.:--------------:.. ...  :--:            
:---.:--------------:.---------------. .::...-:::.          
:---:.:---------------::-------------- .:--.. .-:.          
:--:::::---------------:--------------: ..:--. ..        .. 
-:::-::::------------------------------: :--:.     ..:.     
avg_rgb 97.6 86.7 83.1
-- 4 60 107 --
::----------------=======---==============-------========++=
---------------------------------------======-----------====
--------------------------------------=============-------=-
...::--==-------------------=============--:::::::::---====-
:::::.:-===-----------------==========-:::::::::::::--==---=
::::::...-=+=====-----=------=======-:::::::::-----:--====-:
.. .  .....-+++++===---------======::::::::::..........:----
.:::       .:++++++++=-------=====::::::::.       .--:. ..::
---.        .-====++++*+=-----===-::::::.::        ---:.  .:
----.       ..=======++++**+==-==-:::::.:-:  . .:.:=--:.....
.:---:     . :===--------=++**+==-:::::...::.  .:-----:::...
......:::::::-=-----:---====++*+===-::::::::---:---------:::
:::::::::::::----------=+**+=++*+++==-:::::--------------:::
:::::::::::---::::--=++=+++***+++++++++==--:::-------------:
:::::::::----::::--=++++++**##++++++=++++++++=============--
::::::--------::--=++++++***##*++++--===+++++++============-
:::----------::--++*+++++***%#****+--=====+++++++++=========
-:----------:::-++++++=++**#%#****+=-==+=+++++++++++++==++==
---:-------:::-+*++++=++****%%****==--=====+++++++++++++===-
-----:----:::-+*+++===+++***##****+==:-======++++++++++=====
------:-::::-***++=====+++********+++-:=+++++=++++==========
==---::::::-***+++=--==++**********+++-.=+++===============-
==--=--:::-****+++====+++***#####*++++=-============++++===-
==----==-::-=+++++===++++***######*=+==+==========++++++===-
------------::::---===++****######*=====--=======+++++++===:
-----------------:..::----------===-==-----=======+++++===-.
:----------------------------------======---=============-: 
 -------------------------------==+++++=================-:  
  -----------------------==-===++++++++++=============--:   
. .---------------------======++++++++++==========-===-:    
.. .---------------------------===---------======--=--.     
 -. .-----::..::::::::::---:::::::----::-----====-=-:.      
 .=. :----:::::::::::::::::::::::........:-----=-=-:        
   -. :=-----::----::---:::-------------==----=---          
       -=---------------------------======-----:.           
         -=------------:---:------=====-------.             
           -=-----------------=====--------:                
             -=-----------=============--.                  
              .-=--------======++====-:                     
              ...-===----==========-.                       
       .....  ..::::--===--=----::..                       .
 .      ::.:: .::::::-------::::::.                        .
         .:.-:::---------------::..                        .
 :-     .:...--:::---:---------::. ..                       
-.. .   .:::..=:.:::-----------:. .:.                       
 ::  .:: .:-:.:=----::--------:-: .:.                       
:-. ::----::::..--------------:--..::                       
. :::----------:.-----------------.::   .  :.               
:-::-------------:::---------------.:  .   .:.              
--::.--------------::---------------.. .....---.     .      
:---.::-------------:.:-----------:--. .::...-:-:.          
::--:.::--------------:--------------- .:--.. .-:.          
:--::-::------------------------------: ..:--.              
--::-::::------------------------------- :--::.    .:::.    
avg_rgb 96.4 86.1 82.5
==== 20230622_231747 ====
-- 1 60 107 --
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                          ...:::.           
                                       -======-----:.       
                                     :===+++=--------::.    
                                    -====+*++==-----:::::.. 
                                   -======++++=--:.......::.
                                  .========+=-.   ........::
                                  -======---.  .:--::.......
                                  -==------:..:--.    .::=--
                                 .:.  ..:-=-:::....::-==----
                    .    ...      ::----:-=---=======---:--:
                  .:.    .-::.  ...-:. .:==-::-====---::.. .
                  .::  .====:...-..-:--=-===-:-::-----:..   
                  .::..-===----:-:.===--===-:--:..::...     
               . . ::.:==----...:::------:.      .==--::.   
                :-... .:.:::-:.:. -=---::      .:----::..   
                -.    .-:..-=-:----:::::-===---::........   
               -:  .   -=====-::---..---:-.         .::..   
           :-.::.    :--==-:-:   .....:--:::-===-::::::..   
.         -=:..:=-...   --.....   .:.  .-----:..:---:::.    
......   .=:--......   :=.   .-:.....   .--=======--:.      
::::::::::=-=.......  :=-....:----:. .---+=------:.....     
::::::::::--::::::::-=+-:.::.=-::..:-:--------::......      
:.........--.....=++=+-:.:-..+=:.:--------------:.....      
          ::...:+++-:::......+*=-:-------------==.          
--::::::::-:..:=++=:....::...:---------------:-+++=:        
::::::::::-:..:+==-......:-..-----------------:++++++:      
:::.:::.:--:..:+---.:.......-+----------------:-++==--::::-:
:::.::::::::....::-=-::.....=++=--------------::::::::::::::
::::::::::::....:==-.......-++=.:.     .::-:.  .::::::::::--
:::.::::::::::::-+=-......-++=:             .:-----:------::
::::::-::::::-:-==-:....              ....::------------::::
::::::::::-::::-==-:....    ..       :------------------::--
:::::::::::::-::=-:.....  .:---.    .----------:::::--------
:::::.::::::::::--:.......-----:    .---------::-:::::::::::
----:--:----------:......:----::::.:-----------:::::::::::::
----------------------++=------------:::::::::::::::::::::::
---------------------+*+=:---:::::::::::::::::::::::::::::::
---------------------=+*+:::::::::::::::::::::::::::::::::::
---------------------++=-:::::::::::::::::::::::::::::::::::
--------------------------::::::::::::::::::::::::::::::::::
----------::::----:---==-:::::::::::::::::::::::::::::::::::
----:::---:::-------:::--:..::::::::::::::::::::::::::::::::
---:-:::::::::::::-=-:.:::.:-:::::::::::::::::::::::::::::::
-----::::::::::--:-===-:--=--:::::::::::::::::::::::::::::::
--------:::::::::-:-=--===---:::::::::::::::::::::::::::::::
----:::::-::---::-:::---=-:-::::::::::::::::::::::::::::....
----:::::::::::-------==-::::::::::::::::::::::.............
-------::::::-::--:-====-::::::::::::::::...................
avg_rgb 84.7 45.4 37.8
-- 2 60 107 --
                                          .:                
                                                   .        
                                                .           
  :                ..            ..              .          
                                             ..:::-:::......
          ..      .:.                     .-=+++++======-:. 
                                         -+++****+========--
         .                             .=++++****+++====----
                                       =+++++++***++=-::....
                                      :====+++++++-....:::::
                                      -=+++++===-....:==-::.
                        .            .=++++===--...:-=:.   .
                              .      .==-::::-=-::::.   :--=
                   .        .... ::: .:.....:-+*=------==**+
                                   .  ::-=-:--==--=**+++===-
                           .:...... ...-:. .-=++=-:--====---
    :.                 .   .:---------:---====++==-=------::
  .                    :: .===--:-::--:-+=====+=-:--:. .::-:
.                      ::..====-:.-.:=--===---:..     .+==--
..                      ::.::::-=--=+=--=---::.    .-===---:
                      -.   .:::-++=-::. .::.:-===--:....  .:
                      :.    .=+=--.   ....:--:-:         .--
                      -.   :+-:..... .--.. :--:::-====-:---:
                    :--...:.  ...:-::-=:..  .---=-:..:--=--:
  .. .           ..-=:-==.   .. -#=:-:..     .=--========-:.
    .  .     . . . :=-+-.  . . -##*+-:     ..*##+====---:...
... ..    .....   ..-=-.......+##*=:=*::::..----=----:......
... . ..   .   ....  :-:....:*##*+-:*+#++=-----------: .....
::::::::::--------------:..-###*+=:::*###*=-----------: ....
--------::::::::::::::---:.:=#+:=-.:+++*+------------++:....
--------::-:-::::.::..=*+::....::::+**+--------------++**+:.
                 ....=**+=:.....::::-+--------------:-*****+
-----------=--:-:::-=++=:.::::....-++=-------------------:::
--::-:::--==--------=++-.....-+:..-***+---------------------
---:----:---:------.=++-.....=--:.:***+-==--------:.:-------
--::::::::::---:--:--+=-:=-:-=+=:.=***=+*-------:. :--------
-:---:-------:------==-==::::::..:+**=           .:---------
--------::::------:::::::=-........ ..         .------------
-:::::--:-----:::--------==-:....          ..---------------
---------=----::-----::::==-:.... .-.     :-----------------
----:--:-:::::---:---:-:----:.....--.    .------------------
--::-:--:--:-----:--:-----=-:....---.    .------------------
--:-------------=============-:::---::. .-------------------
============--=========---------=---------------------------
============--=-==------------------------------------------
=============-----------------------------------------------
========----------------------------------------------------
======--------:------------------------------------------:::
==------------:------------------------:------------::::::::
===-------------------------------------:::-----::::::::::::
=--------------:-------------------------:::::-:::::::::::::
----------------:-------------------------::::::::::::::::::
----------------:-------------------=-------::::::::::::::::
----------------::-----------------=-------:::::::::::::::::
avg_rgb 99.4 55.7 43.7
-- 3 60 107 --
                      .            ..     ...:..            
                                       :::--===--=-...      
                           .:        :++****#**++++=-:....  
                                   .++++***###**++++++=-:.. 
                       ..    :.   .+++++++++**#***+++++===-:
                                 .=++++++++**#***+=========-
                           .     -+++++++++**++-::::::::--==
                                .=+++++++++=:....:-=---::--=
                                :++++++===:...::-===-::::---
                                =+==----=-:.::-==-:.....-=++
                                .. ...::==-::::..  .-=++=**+
             .:..-:      .      .:::::.:+#+==-------+***=*++
         ..      .-.::        ...:-:..:-++=+*#########*+=+==
       ..  :=-==-:..         .. ....:-=+**+-:==++++==--=+==-
       :: .====+*+=:   .     :...-=-+*+***+=--::-------::==-
       .-.:++++=-----:      .-:. =*+=-+++==+*+-:---:::....:-
       .:::---=+-::++-..+.    -.:------::...................
     -.    :::=*****=-..:      :++---:......  .=++==--:.....
     :.    .+*+=:.::.:.           ::.....  .=*++==---:::....
     .:  .=+-:.. .:=+-..          .:::--......     .::::....
   :++-:::.....-=-:=+::...=+:      .::..         .::::::....
.. ==-:=...     .-=-:::...=#++#%#=. .::-::--==---==--::.....
.  -=::.......  -.........-=#%%%%##+. .:--:...:-===---:.....
  . ::.:......-##+:......=#%%%####**+=. :=+++++++=--:.......
 ....:..::.. +%%##+...::-#%%###******+**#*-==---:...........
.....::.:: .#%#*++--*+-:*%####***++*+-===-  ................
-------..-#%#*+==:::*##%##*##**+==*=-=====.     ............
-------.....:::==-::=***+##+**+-=+-=======.     ............
---==--:.....:::--::-#*##****+===-========.     ........... 
        ...:-:..==-::=++***+=--=-=======--.       . .       
----==--====-=**#+::::-++==:-=--=========--:-:.        .:---
-:-====-----+****+-.:::::::=#*=-===========---=::::::-------
::---------=***+-::::::::::*#**======----------:------------
-------:---+*++=:::::::::::*#*++*=--------------------------
===========**++-:::::+=:::-***==*-------.:------------------
===+=---===*+==-:=:.:+*+-.=**+==------:.:-------------------
--:::-----=+-=---+++++=-:::=-.:-==--...---------------------
------=-====--=++-.:::......        ..----------------------
---------:-::---=-:.......        .-------------------------
--===--------==+++-......        .--------------------------
-------=======+++++=-::..     .-----------------------------
++=+++++++++++++++==---=:.   .------------------------------
+++++++++++++=====-----=:.  .:------------------------------
+++================-..==-.. .-------------------------------
================---:.=+++-..--------------------------------
================-::.:=+++=::--------------------------------
==============--::..====: .:--------------------------------
===========---::...-====-:  :-------------------------------
===========--..:..-====--:..------------------------------::
============-...  :==---:..:--------------------------------
==========-=-::...-----:. .------::---------------------::::
==========-=-::..:=---:.  --------::-----------------:::::::
=============-:..:---:.. :---------:::::::::::::::::::::::::
========-::::::...::.....------------:::::::::::::::::::::::
avg_rgb 127.9 64.5 60.1
-- 4 60 107 --
                                   .. ..                    
       --  :=:                .    .....                    
           :-:                   ......                     
                                 .                          
                       ..  ..::--=-:.                       
                          ::-=+***=-=+=:.                   
                         =*++++***###**==-:::.              
                        =+++++=+++**#***++==-:..            
                       -+=====+++***+++=++++====:.          
                       -=====++++=-::::::--====-==:        .
            .         .--======:.  .::::..::-===---:        
               .. .   .====--:. ...:-=-:.:::=++++=--:.      
      .    .     ..   .=-::.......... . .-*##**++-=-::.     
    ....                  ........ .  :=*=*#**+=----::.     
    .          .       .. ...++=.....:+**=++===-::::....   .
.. ... ..   . .      ....:.::++=+*******+=+==--:::...... .--
.   :....::-::--.   .......:+##=-+==++*++++==-::::......    
. .......     :=::-:.:....:+*#****=---=====---::::......    
. .:.   :==--:.....:::-..=+=--:---:.-::.::::::..........    
:::-: .=--==+*+=:   ..--:-=-:...........................    
  .--.:=++====-===:    :.:-:::.....++:..................    
. ..-.:=-:--:--:-+=-.:. . .::.........  .................   
.=     .---+**+**+=::-.  ...::..       .........::::.....   
..:.   .=+++**-:--:-.     .. .:...............:::::.......  
.-.   :==-:.. :-..::.  .  .    .:......:..................  
::. =#+. ... .-==+-::.==:.       :...:--:..................:
::=*-      ...:=+-::..+##*+*+: .==::::::..................:+
===.   .    ....::....=*=#%%%%#=-:       ................:=-
..:.  ...........   .:=*%%%%%#==-.       ................---
..:..:...:+-.........*%%#%##+-=-..       ...............---=
........-#+:......::=%*+=+*=-==.        .........     .-==--
:...:--*%%#==......:#*-::-=:-=-.           ..       .:======
=:..:-#%#**+#=..:.:**=::::::===-.      .          .:=--=====
=-..:::+**=+*#******=:::::::===-.               ..--=======-
==:....:=**=*****#*+-::::::-====.             ..---==-------
   .....-*+=##*###*-::.:::-+=----:.:      .:-===============
=-=-:::--==*##***+-:::::::-+===--==:....--------------------
--------=--+#*==-:::::::::-====-----..:---------------------
--=----====+*+---:...:::::-=========================--------
==--=======+**=:::.::-:..:-=============================----
====-======+*+*-.:*+-=+=:....-------------------------------
====-======***#+::....... ....:-----------------------------
-----======***##-....        ....-===========-----------=---
===---=====****##+:..         ..-=--------------------------
==-=======-=-=*++++*=         .:----------------------------
=-===-===+++++++++=-...   .:-------------------------:::::::
===--=++=++++++==-.:+-....:--------------------------------:
=------==-=====:.-==--:...--------------------:::::::::::::-
=+++=---=-:--:-.-------...--------------------------::....  
++++=-=+----++===+====- .:----------------------------------
+++++++++==++++====+=:   .:-----------------------:::::::...
+++++=======--==+++-      .:--------------------::::::::::::
==============-.:=.      .. .:----------------::-:::::::::::
============---:=:      :: ...:::::::::::::::::::::::-------
avg_rgb 114.4 55.5 51.1
==== 20230626_132021 ====
-- 1 60 107 --
:...::.      :=====:-==.-=+++++++++++====:      ........::--
 ..:.        :=====:-==.-=++++++++++====-:      ........  ..
   ....      ..====.:==.:-++++++++++====-.             .....
                :==::-=.:-++++++++++====:                .. 
.       . .     .:-::-=::-+++++++++====-:                   
         .. ..      :--.:-. :=++++=====-.                   
        ...    ...  .-:..:.   :++======:                    
        .::. .   .. .:: .::.  .========.                    
         ...  .   ...:: ......:=======-                     
      .   ..... :--::.........:=======:                     
   .   .    ..:-=========-:.. -======-                     .
...         :-====:.....::-=+++++====:                    .-
:         :--===:........::::-=+++===++==-----::..        .=
.       -=---:.......::::::::::::--=+++=++++++===========*++
...   :-===:.....:::::::::::::::-------==+***++++***++***#++
....-----:.::::::::::::::. .:::-------===++*++**************
..=====-:...:::::::::::::::::--------===+**********+********
==-=======-:::..:::::::::::--------===+**++++*****=*%%%%##*#
==========-:.:=--:..::------------===+**+++++++=:=#%%###%%%%
========+=::-+++===--:..-+#+----===+**+**+++++-:=%#**%%%%#%%
==========::-==+++++==*+*######+==+*+==++++++=:-+*%%%%%%%%%#
===================+++++*=*#**#####****++=---:-++*%%%%%%%%%#
=====-============*#*+**+###*=#####+*+++****#***#%#**#%%%#**
===============+#########*++++*++*#*=+++*****####+*%%#**#**+
=======--====*####*######+*+*##%#*=--=******==+#=.....:=#*+*
-==========+++#*****#*####*###*+++*****+=*=-===:::::..-#*==+
:++======---+*##**#*++*#*++**+++++**+++**=--=:::::...-*=#%%%
=+++=====-::::=####**####*=--+******++*=-:-=.:::...:-#=*%%%%
==========--::::-+#####%*=--=--==+****=-:--....:-:.-######%#
----=======---:::++-#%#+*#*+++*=----=----:....:::.-#%%%%%%%#
:----========--:::+%=:=*#*****#*++----==......:..:*=+%%%%%*=
----=========--::::=##*::-+****#+==+**=.........:*+#%%#+=--=
=----===---=--::::::=%#-----:-+*++**#-...:-:...:**=#%%%#=--=
=====--------::::::::=#*-------:-=+*-=*+-.....:#%%%+-=----=*
======----::::::::::--:-+-----------:-:::-+*+-+=----------++
-====----:::::::::::-:::---------------=+=-::-----==-----=**
==--------::-===--::---------====-----------=+==---====-=+**
====------:+#%%#*%%*==--------======---------:---=+=----+***
----------:-+#%%%%%%#====---=====--=======-----=+*+--=+++***
-------::::-=*#%%%%%%#++=++===============--=--=====+***++**
-----::::::===*#######*++++===++============-=====++====++**
-----:::::-===*#######*=+++++==++++===========--=-=+*++++===
----::::::-=-==+**####*+++++++++++++++++===++++=-:---=+****+
----:::::::=====+**###+++++++++=+++++++++++++++++=---===+++*
----:::::::-=====+***=====++++++++++++++++++*+++++++++++++=+
::...::::::::--====-======++++++++++++++++++*++++*++++******
::::::::::::::---========+++++++++****++++*********++++*****
---::::--------===========+++++++++++****************++*****
-----------===========-======++++++++++***************++****
:----------===================++++++++++++*****************#
::.::------====-================+++++++++++*+***************
:::::.:-------=========+=======+=++++++++++++***************
----::::::-==========++++=++==+++=+++++++++++++*************
------::::::::-==========+++++++==++++++++++++++************
avg_rgb 129.5 113.4 101.3
-- 2 60 107 --
---.:-++++++++======-                   ....... =**#####----
--=.:-=+++++++======-.                         -***####=::::
:---.:-+++++++======-.                        :****###*:::::
.:--.:-=++++++=======.                       .+***#*##=:::--
.:-: .::.:-=+========:                       -****#*#+-:-:::
 .:-. .:.   .========:                      .+*******=:---=*
  ::: ...    .=======:                      -++*****+:---=*#
  .::  .... ..=======:                     .=+++***+-:=--*##
  ....  ......-====-=:                     -+++***+=:=--+###
  ............-======:                    :==+++*+=:---==+*+
::........... :=====-                    .-=++++++-:--.:::::
-------=--:.. :=====-::::::...            -==++++-.::::...::
......:-===========------=------====--==+*===+++=..:...::...
...........:-======-==========-====+=+++**==++==:.......::..
...........:::::::-=++++++===+++++++++++**==+=-:..........::
..........::::::::::---=+++++++++++++++++++==-:.....  ......
.....   .::::::::::--=++++++++++++++*******+++**#**+=:.  ...
.....:::::::::::::--=+++++++++=+##%##********+++***#####%##=
..::::::::::::::---=+=======--+##**+#%%%*+++*****-+########=
:::::::::::::::---+++++++==-:*#*=#*##*##**+*****+:-****####:
...::--:::::::--=+=+++====-:-*#*#**##%%*+=*****=.=:+***###*.
--::=****+-::--=+-===-----:-=+#%##++*%%*++****+=#%:-****##+.
==*++#****###+++**+++==--:-*#*=+**%%#*+++*****=+%%-:+***##=.
=++=++*#*+****#+++=+********++##*+++++++******=*%#=.=**###:.
++++=+*******++*=+++**++**##+..::-=+*+++*****+-*#*****####..
****#*==++++*#+--=*+++*=-=*+:.....*++=:-=+++**+++++****##*..
*****=++**#*++**+==--+---=:.:....**=###*===---=++++*****#=..
++*******#+=--=++++*+-:--.:::...+*=####*--+***+==--=+****-..
=+***==++=+++++++=+-::--.......=**#####+-=++====++*******:..
++***+=-:-=+++++++=::-: ...::.-#######*-==++++++++*****#+...
****#+:-----::-==--:-:.......-*+#####*--========+******#=...
**#*=**+++*=------:-. ......:*=-+#*+---=+=====-==+******#*=:
:::=+++++***+=::-==. ......:***####=--========-==**++***#%%%
#*+...:=++++=-=*#=...:::...+##==*+----+=====-==-=*******###%
###*-::::::-=++++--:.   ..=*##+-:----++++-------+*******%%%%
##**+-::::::::.::....:---++--::::---=+=+++*#+---+******##%%#
:=+**+=::::::::::::::--::::---====--*=++++++++*+*******#####
::....:::::::--::::::::::::----::---++++++++++++*******##*##
..:::::::::------::::::::::----:--====+++++++++*********+*##
-::::::::::--::::------:::::--:---==+++++++++++*******+=+*##
##=-----:---------::----::--------------==+++++*************
###+=--===----------------:-:-:-=============+****++*******#
####+====----===-------------:.:::-=+==++++++****+****###*##
#**#+-======--========---=====-::------=++++++***+***#######
#***+============================-==++++++======+++**#######
****========-========================++++++++++++++++#######
***=----=============================+++++++++++++++*#######
=------========+=++============++++==+++++++++++++++*####***
-------=============+++++++======+++++++++++++++++++*#####*+
----------==============+++++++===++++++++++++++++++*#######
-----------=================+++++++++++++++++++++++*#**#####
---------==----====-========++======++++++++++++++++-=-=+*##
--=----------==-==================+++++++++++++++=+=-::::--+
------====--===========================++++=+++=+++=-:::::::
avg_rgb 130.1 118.2 107.6
-- 3 60 107 --
..      .-------:::.............:.:::-=:.::-++++++++++++++++
        .-=----:..:...............:::==:..::++++++++++++++++
.  ..::-========. .... .....:-.::::::=+-...-++++++++++++++++
.      .--=====-.::......:.--::--::--:=+--.:++++++++++++++++
.        .-====..-=-. ...-:-:::--::::--=-=*+++++++++++++++++
.:.       .--=-:===.....--::::-=-===****==*+++++++++++++++++
.:-:. .    :======-....=+-.....--+******++++++==++++++++++++
.:----:  ..-======:..:=+++-::..:=*******++++++=++======+++++
..------==========:.-+++++=::..:+*******+++++==+++++++++++++
..-------============+++++=:-::=+*******+++++==+============
..:-: :---====-:-====+++++=:=-:=+*******+++++--=============
...::.:------::-::    -+++=:=+:=+******+++++=: .....:::--===
. ...:::.   .::....   =+++=:==:=*******+++++=.  ............
:..:. .:...         ....=+-:==:=*******++++=-.   ...........
  ..........    ....... .-::=-:=+****++++++=:      .........
  ..:.  ...      ... .... .:=:.-. .=*++++++-.         ......
 ...      .      .::.. ... :-:.::  .=++++==:            ....
.  ...    ..      .. ..  ..::...:..:++++===.            ....
   ....  . ... ..  .:.. .--::.:::..-++++==-             ....
-:...   .:...       .:.-======++=-:=+++=+=              ....
---. ....:-.         -=++=:.:::::-=+*++++===---:..      ....
-----.......      .====:.::::::::-----==+++++++++===++===--+
:::-:-:.....    :-===:::::::::----------====++*************#
:::::::-....  :===-::-:::::-----:.:----=====++*#************
::::::::::::-===+===-..:-------------======+*#********+##*##
:::::::..:===++++++==::=-:::-------======++*#++*++++=+#%#%%%
::::::.:=====+++++++-:+++++==-::=#*=====+*#******+=-+%#*%%%%
::...:=======+++++++=-=+++++++#*####%#*+*#+++++++=-=+#%%%%%%
:..-===++++++++==+++++++++=+*+*+*#%#*###%#*****++--***%%%%%%
.-===+**+++*+++++++++++==*#######****##********######%%#*###
======**++++++++======+##########***##%%*==+*****++##:::-=*#
=====-:*+===-:+==+++=*++#*#*+#####*#%*++***#*+**-=+=-:::::+#
=====: -+-::.=*+++=---=*###****##**********++*+--=---::::++*
====--:.-=:-=++=+++==---:=######%*---=+******=---.::::::+**%
---:::::::-----=++====---::=+#%**##++++--=+=-==-..:::::=%%##
-------:::::-==-=+=+===--:::===*##***##*+=-===:....::.=**%%%
--------============+===-::::=%*--+*#***++*#+::.:::::-*+*#%*
----==================--::::::-+-==---+***#*:...::..-#++%%%#
====+==============--:::-::::---+==-==----:.-+**=:.:#%%%=---
===+++++==========----:::::::-------======-=++-::=+*=-------
===================---=##+=----==--=========---=+++=--==+===
==================---:-*#%#%#====-====++===--===--::=+++=---
================-----:=+*%%%%%+===================-=**+--+++
===============---:::-++=*#%#%#++++++=========+=-======+****
==-============--::::=+==*#####*+++++++++====+========+++==+
-==-=-====--------:::-===++*###*+++++++++++++==+++======+*++
=------=-----------::-====+*###*+++++++++++++*+++++++=----=+
 .---------------:::::-=+++***++++++*++++++++*+***+++*+=====
    :---------:::---:-:::--===+++++++****+++++++********++++
      .:-----------------======++++++++******+*++********++*
         .-=---------============+++++++++****************++
            :-=--=======+========+++++++++++****************
    :::::::::.:--==========+===+==+++++++++++++*************
.-------::::::::::-=-========+++=+++=+++++++++**+***********
avg_rgb 126.7 112.3 99.4
-- 4 60 107 --
:.:=:-=-===============--====+******##***+=+#*#####%%%###%%%
...:-:-================--====+******##***+++####%#%#####%%%%
::..:::-==============---====+******##***++*####%#######%%%%
:::.....:=============---===+*******##***=+############%@%%%
-:::..::.:============---===+******###***++####%######*#%%#%
---::...:.-===========---===+******###**+++##########*-*%%%%
.--::::::::-==========---===+******###**++*###%###*##+-*%%%%
 :--:-::---:-=========---===+******###**++####%######==%%@%%
 :----------:-========---===+*****####*+=+#####*****#*=#%+-+
  :==----------=======---===+*****###**+=*####%%#%%#**=####=
 ..:===---------======--==-=+*****###**++#####***+*=-=++*%*=
.  .:===----------===---==-=+*****##***++#####**++*=-=-***=*
:.. .===-----------------=-=+*****#*+++++####*+-+*=--=-**++*
:::=--=--------------------=*******#**+=**+=-==*+=*+=++**+**
==-:====-------------------=******##**=+######**=::--+#+*##+
========--------------------+*****#**+=+###%%#=+=*=-=###***-
======--------------------:-+*****#*++=+**#+==------=+#%##=:
======---:-----::::::::::::-+****#+--=====++-:::--=-=+*##*::
======---::::-::-----:::--:-+****#=--------=-::----==+++*-:-
======---:             ......:***#-::---:------------:-==::+
======---:                   =****-:::::::-:::.:::-::-:-::==
======---:                  :*+***:::::::::..:---------:.-+=
=====----:.                 -++**+:--=*+:........::::::::+=+
 :-=------.                 -++**=:--+*#**#=.....::::::.====
   -------.                .==+++-:--*******%#+:.:::::.-===:
   :------.                :===++::-:..:::----+#%*-::.:=-=::
   :------.                .-==+=.........:::::--*#::.--=-..
::.:------.::::::::::-----++-=+=-..............::-:..:--:.::
.::------------==========+++===-:..    ..............::.....
.........:::::-=========+++++++++++****####+::....:.:... . .
........:::::-=========**###**++++**=:*****#:..:......=.    
  .....:::::-==-==--::****+**#+=+***-:-++**#=..:.... =-     
......:::::-=======-.=*+++*###+=+**+-**.+****........-.     
.....:::::-=======-::==###**#*+=++++-+#=.=**#= .....-:      
:-=-:::::-=----:::-:-+**+==+++==++++==**++****......        
=*+*+****+*=====+++++**:....++==++++++++++****-........     
===**-++*+=+==-===+--+-....:+=**+-------===+**+..........   
-=++=-+==*+-:--=:=-:-:.....==+#**+-=+=++==+****: ...........
**===+***++++=++*-:::......++*+=++-==+++++*****= . .........
*+=+***=----==-=-:.-.  ...:*#*#**--=======+*****: ..........
+*+=-+==========:.:.   .. ==+***-:-=====-==++++*= ..........
+*===:::-----=-:::.   .. :+=***+::=======-=+***++*+=:..   ..
***=.::---:::::::-       -+-+*+-::===------=+++++*##**##***+
**==+==+*+==-.-+=...... .+*#+:::::==++++=--=++++++####***#**
*=++====+++=-=+*:       :=-:::::::========++++++++*#####*#*+
:-==+++++++++=++======++=-::-----:-=========++++++**#*****==
**:............. ::::::::----------=========+++++++*******-=
++-::::::::::::::::::::::..::::::-=========+=++++++*+*###*--
.:=+-::::::::::::::::::::::======+++++++++++++++++++++****+:
:....:::::::::::::::::::::::::--------------=++++++++=++***-
.....:::::--------::--:::::::----===========++++++++++++**+-
...:::::::::::::::::::--::::::::.:::============+++++++++***
.:::::::::::::::::::---::--:--:....:::-------=======+++++***
-::::::::::::---::::::-:-------------===============++******
avg_rgb 119.3 115.5 108.7
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
import shutil
for cmd in ['tesseract','magick','mediainfo']:
    print(cmd, shutil.which(cmd))
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 314ms:
tesseract None
magick None
mediainfo None
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
import os, colorsys, math
outdir = Path(os.environ['TEMP']) / 'codex_video_frames2'

def read_ppm(path):
    with open(path,'rb') as f:
        if f.readline().strip() "'!= b'"'P6':
            raise ValueError(path)
        def token():
            tok=b''
            while True:
                ch=f.read(1)
                if not ch:
                    return tok
                if ch==b'#':
                    f.readline(); continue
                if ch.isspace():
                    if tok: return tok
                    continue
                tok+=ch
        w,h,maxv=int(token()),int(token()),int(token())
        data=f.read(w*h*3)
    return w,h,data

for base in ['20230619_230408','20230622_231747','20230626_132021']:
    print('VIDEO', base)
    for i in range(1,5):
        w,h,data = read_ppm(outdir/f'{base}_{i}.ppm')
        n=w*h
        bright=dark=sat_hi=skin=green=blue=red=0
        avg=[0,0,0]
        for j in range(0,len(data),3):
            r,g,b=data[j],data[j+1],data[j+2]
            avg[0]+=r; avg[1]+=g; avg[2]+=b
            v=max(r,g,b)/255
            m=min(r,g,b)/255
            s=0 if v==0 else (v-m)/v
            h_ = colorsys.rgb_to_hsv(r/255,g/255,b/255)[0]*360
            lum = 0.299*r+0.587*g+0.114*b
            if lum>180: bright+=1
            if lum<60: dark+=1
            if s>0.5: sat_hi+=1
            # simple skin threshold
            if r>95 and g>40 and b>20 and (max(r,g,b)-min(r,g,b)>15) and abs(r-g)>15 and r>g and r>b:
                skin+=1
            if 70<=h_<=170 and s>0.2 and v>0.15:
                green+=1
            if 180<=h_<=260 and s>0.2 and v>0.2:
                blue+=1
            if (h_<=20 or h_>=340) and s>0.2 and v>0.2:
                red+=1
        avg=[round(x/n,1) for x in avg]
        print(i, {'avg_rgb':avg,'bright%':round(bright/n*100,1),'dark%':round(dark/n*100,1),'sat%':round(sat_hi/n*100,1),'skin%':round(skin/n*100,1),'green%':round(green/n*100,1),'blue%':round(blue/n*100,1),'red%':round(red/n*100,1)})
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 428ms:
VIDEO 20230619_230408
1 {'avg_rgb': [98.2, 87.5, 83.6], 'bright%': 2.3, 'dark%': 23.2, 'sat%': 12.8, 'skin%': 26.1, 'green%': 0.0, 'blue%': 0.6, 'red%': 15.3}
2 {'avg_rgb': [98.7, 87.2, 83.2], 'bright%': 2.3, 'dark%': 23.0, 'sat%': 13.5, 'skin%': 27.8, 'green%': 0.0, 'blue%': 0.1, 'red%': 16.7}
3 {'avg_rgb': [97.6, 86.7, 83.1], 'bright%': 2.4, 'dark%': 23.8, 'sat%': 12.8, 'skin%': 26.8, 'green%': 0.0, 'blue%': 0.1, 'red%': 16.0}
4 {'avg_rgb': [96.4, 86.1, 82.5], 'bright%': 2.2, 'dark%': 24.4, 'sat%': 13.1, 'skin%': 25.4, 'green%': 0.0, 'blue%': 0.2, 'red%': 14.6}
VIDEO 20230622_231747
1 {'avg_rgb': [84.7, 45.4, 37.8], 'bright%': 0.0, 'dark%': 47.0, 'sat%': 71.2, 'skin%': 44.5, 'green%': 0.0, 'blue%': 0.0, 'red%': 42.6}
2 {'avg_rgb': [99.4, 55.7, 43.7], 'bright%': 1.3, 'dark%': 41.7, 'sat%': 73.6, 'skin%': 55.2, 'green%': 0.5, 'blue%': 0.0, 'red%': 38.3}
3 {'avg_rgb': [127.9, 64.5, 60.1], 'bright%': 4.5, 'dark%': 35.4, 'sat%': 68.6, 'skin%': 57.5, 'green%': 0.5, 'blue%': 0.0, 'red%': 58.7}
4 {'avg_rgb': [114.4, 55.5, 51.1], 'bright%': 3.7, 'dark%': 48.6, 'sat%': 73.5, 'skin%': 44.5, 'green%': 0.5, 'blue%': 0.0, 'red%': 58.6}
VIDEO 20230626_132021
1 {'avg_rgb': [129.5, 113.4, 101.3], 'bright%': 13.7, 'dark%': 19.8, 'sat%': 23.1, 'skin%': 51.1, 'green%': 3.3, 'blue%': 4.8, 'red%': 12.4}
2 {'avg_rgb': [130.1, 118.2, 107.6], 'bright%': 16.5, 'dark%': 18.3, 'sat%': 17.6, 'skin%': 42.7, 'green%': 4.3, 'blue%': 7.2, 'red%': 6.0}
3 {'avg_rgb': [126.7, 112.3, 99.4], 'bright%': 10.9, 'dark%': 20.6, 'sat%': 19.0, 'skin%': 43.7, 'green%': 8.2, 'blue%': 5.2, 'red%': 13.8}
4 {'avg_rgb': [119.3, 115.5, 108.7], 'bright%': 17.3, 'dark%': 19.0, 'sat%': 12.5, 'skin%': 26.4, 'green%': 7.6, 'blue%': 7.3, 'red%': 7.2}
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'ffmpeg -filters | findstr /I ocr' in C:\Users\tokeii\Desktop\mp4
2026-04-07T09:47:42.435265Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.3 seconds
Output:
ffmpeg version 7.1.1-full_build-www.gyan.dev Copyright (c) 2000-2025 the FFmpeg developers
  built with gcc 14.2.0 (Rev1, Built by MSYS2 project)
  configuration: --enable-gpl --enable-version3 --enable-static --disable-w32threads --disable-autodetect --enable-fontconfig --enable-iconv --enable-gnutls --enable-lcms2 --enable-libxml2 --enable-gmp --enable-bzlib --enable-lzma --enable-libsnappy --enable-zlib --enable-librist --enable-libsrt --enable-libssh --enable-libzmq --enable-avisynth --enable-libbluray --enable-libcaca --enable-libdvdnav --enable-libdvdread --enable-sdl2 --enable-libaribb24 --enable-libaribcaption --enable-libdav1d --enable-libdavs2 --enable-libopenjpeg --enable-libquirc --enable-libuavs3d --enable-libxevd --enable-libzvbi --enable-libqrencode --enable-librav1e --enable-libsvtav1 --enable-libvvenc --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxavs2 --enable-libxeve --enable-libxvid --enable-libaom --enable-libjxl --enable-libvpx --enable-mediafoundation --enable-libass --enable-frei0r --enable-libfreetype --enable-libfribidi --enable-libharfbuzz --enable-liblensfun --enable-libvidstab --enable-libvmaf --enable-libzimg --enable-amf --enable-cuda-llvm --enable-cuvid --enable-dxva2 --enable-d3d11va --enable-d3d12va --enable-ffnvcodec --enable-libvpl --enable-nvdec --enable-nvenc --enable-vaapi --enable-libshaderc --enable-vulkan --enable-libplacebo --enable-opencl --enable-libcdio --enable-libgme --enable-libmodplug --enable-libopenmpt --enable-libopencore-amrwb --enable-libmp3lame --enable-libshine --enable-libtheora --enable-libtwolame --enable-libvo-amrwbenc --enable-libcodec2 --enable-libilbc --enable-libgsm --enable-liblc3 --enable-libopencore-amrnb --enable-libopus --enable-libspeex --enable-libvorbis --enable-ladspa --enable-libbs2b --enable-libflite --enable-libmysofa --enable-librubberband --enable-libsoxr --enable-chromaprint
  libavutil      59. 39.100 / 59. 39.100
  libavcodec     61. 19.101 / 61. 19.101
  libavformat    61.  7.100 / 61.  7.100
  libavdevice    61.  3.100 / 61.  3.100
  libavfilter    10.  4.100 / 10.  4.100
  libswscale      8.  3.100 /  8.  3.100
  libswresample   5.  3.100 /  5.  3.100
  libpostproc    58.  3.100 / 58.  3.100

 exited 1 in 343ms:
ffmpeg version 7.1.1-full_build-www.gyan.dev Copyright (c) 2000-2025 the FFmpeg developers
  built with gcc 14.2.0 (Rev1, Built by MSYS2 project)
  configuration: --enable-gpl --enable-version3 --enable-static --disable-w32threads --disable-autodetect --enable-fontconfig --enable-iconv --enable-gnutls --enable-lcms2 --enable-libxml2 --enable-gmp --enable-bzlib --enable-lzma --enable-libsnappy --enable-zlib --enable-librist --enable-libsrt --enable-libssh --enable-libzmq --enable-avisynth --enable-libbluray --enable-libcaca --enable-libdvdnav --enable-libdvdread --enable-sdl2 --enable-libaribb24 --enable-libaribcaption --enable-libdav1d --enable-libdavs2 --enable-libopenjpeg --enable-libquirc --enable-libuavs3d --enable-libxevd --enable-libzvbi --enable-libqrencode --enable-librav1e --enable-libsvtav1 --enable-libvvenc --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxavs2 --enable-libxeve --enable-libxvid --enable-libaom --enable-libjxl --enable-libvpx --enable-mediafoundation --enable-libass --enable-frei0r --enable-libfreetype --enable-libfribidi --enable-libharfbuzz --enable-liblensfun --enable-libvidstab --enable-libvmaf --enable-libzimg --enable-amf --enable-cuda-llvm --enable-cuvid --enable-dxva2 --enable-d3d11va --enable-d3d12va --enable-ffnvcodec --enable-libvpl --enable-nvdec --enable-nvenc --enable-vaapi --enable-libshaderc --enable-vulkan --enable-libplacebo --enable-opencl --enable-libcdio --enable-libgme --enable-libmodplug --enable-libopenmpt --enable-libopencore-amrwb --enable-libmp3lame --enable-libshine --enable-libtheora --enable-libtwolame --enable-libvo-amrwbenc --enable-libcodec2 --enable-libilbc --enable-libgsm --enable-liblc3 --enable-libopencore-amrnb --enable-libopus --enable-libspeex --enable-libvorbis --enable-ladspa --enable-libbs2b --enable-libflite --enable-libmysofa --enable-librubberband --enable-libsoxr --enable-chromaprint
  libavutil      59. 39.100 / 59. 39.100
  libavcodec     61. 19.101 / 61. 19.101
  libavformat    61.  7.100 / 61.  7.100
  libavdevice    61.  3.100 / 61.  3.100
  libavfilter    10.  4.100 / 10.  4.100
  libswscale      8.  3.100 /  8.  3.100
  libswresample   5.  3.100 /  5.  3.100
  libpostproc    58.  3.100 / 58.  3.100
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "ffmpeg -ss 0.5 -i \"C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230626_132021.mp4\" -frames:v 1 -vf scale=80:-1 -f caca -loglevel error -" in C:\Users\tokeii\Desktop\mp4
2026-04-07T09:47:53.100637Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.8 seconds
Output:
[caca @ 000002701d7e2900] Unsupported pixel format 'yuv420p', choose rgb24
[out#0/caca @ 000002701d7e2800] Could not write header (incorrect codec parameters ?): Invalid argument
[vf#0:0 @ 000002701d7c3580] Error sending frames to consumers: Invalid argument
[vf#0:0 @ 000002701d7c3580] Task finished with error code: -22 (Invalid argument)
[vf#0:0 @ 000002701d7c3580] Terminating thread with return code -22 (Invalid argument)
[out#0/caca @ 000002701d7e2800] Nothing was written into output file, because at least one of its streams received no packets.

 exited 1 in 825ms:
[caca @ 000002701d7e2900] Unsupported pixel format 'yuv420p', choose rgb24
[out#0/caca @ 000002701d7e2800] Could not write header (incorrect codec parameters ?): Invalid argument
[vf#0:0 @ 000002701d7c3580] Error sending frames to consumers: Invalid argument
[vf#0:0 @ 000002701d7c3580] Task finished with error code: -22 (Invalid argument)
[vf#0:0 @ 000002701d7c3580] Terminating thread with return code -22 (Invalid argument)
[out#0/caca @ 000002701d7e2800] Nothing was written into output file, because at least one of its streams received no packets.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "ffmpeg -ss 0.5 -i \"C:\\Users\\tokeii\\Desktop\\mp4\\videos\\20230626_132021.mp4\" -frames:v 1 -vf \"scale=80:-1,format=rgb24\" -pix_fmt rgb24 -f caca -loglevel error -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 526ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
import os, math
outdir = Path(os.environ['TEMP']) / 'codex_video_frames2'
path = outdir / '20230626_132021_2.ppm'
with open(path,'rb') as f:
    assert f.readline().strip()==b'P6'
    def tok():
        t=b''
        while True:
            c=f.read(1)
            if not c: return t
            if c==b'#': f.readline(); continue
            if c.isspace():
                if t: return t
                continue
            t+=c
    w,h,maxv=int(tok()),int(tok()),int(tok())
    data=f.read(w*h*3)
# grayscale
img=[[0]*w for _ in range(h)]
for y in range(h):
    for x in range(w):
        i=(y*w+x)*3
        r,g,b=data[i],data[i+1],data[i+2]
        img[y][x]=0.299*r+0.587*g+0.114*b
chars=' .,:;irsXA253hMHGS#9B&@'
# sobel magnitude
for y in range(1,h-1,2):
    line=''
    for x in range(1,w-1):
        gx=(img[y-1][x+1]+2*img[y][x+1]+img[y+1][x+1])-(img[y-1][x-1]+2*img[y][x-1]+img[y+1][x-1])
        gy=(img[y+1][x-1]+2*img[y+1][x]+img[y+1][x+1])-(img[y-1][x-1]+2*img[y-1][x]+img[y-1][x+1])
        m=min(255, int((gx*gx+gy*gy)**0.5))
        line += chars[m*(len(chars)-1)//255]
    print(line)
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 300ms:
:B3B@H, .....,,,..X@@i. ......   ..  .,::::::s@@5:: ih@@i;
A2&i@@A      .,,,.r@@X.       . ..,........ ;@@G.r:..@@2,,
Gi&3#@G,    ...,,.;@@5             ..      .@@@ ir.,H@@,,r
GA9SMB@@@H; ..,,,,:@@H                     G@@::s,.i@@5A:X
&A9G3h5GS@@@H.,,,,.9@S.                  .:@@9.ri ,B@Hs;X@
99r@,M:G2.:@@9,,,,.S@9.                   9@@;;s:.2@@i;,@@
5&X#hsX 22ih@@.,,,.G@B                  .;@@M:r;,i@@;s,H@@
.A2iM.Xr.r;:@@::,, G@9                  .S@@;ir;,h@MX,X@@A
,;ri;ii.,;,.@@s,.. H@9.       ..        X@@A:ii,X@@:::@@9M
5i..,,.  ,, 9@3,.,.@@3.                ,@@#;:;;i#@XhAS@@@@
h&@@@@@@#3s:H@G,. i@@@@&9SH5s;,.  ..  .i@@#i;;,3@@r5iA,:;i
@@@BSG5:5&@@@@5,:,ss;sA3M3h9@@@@@@@@@@@@@&Ass A@@r;rr;;;.;
...,r39@@@@3:.,..,.rA55A535s;,,:is2AG#S2&#A5.5#@@r;::ii i:
........,,i3B@@&Mi;sri::::;s2hh35AXXr,rr@#h;5S@@2,,::::XXi
....,........,,:iAH9&#3;.:ii:,.... :rsXASMi2@@&s:is.::::rX
...;3h3s,...,,,,,:;sMBH;..... .,,,.iA2Xi:3MM@@@@@@@@G:,;;:
...ihHhs...,,,,,:iAGSi:,   .rA9@B&#3s:,:;irr.s2r.A#@@@@@@@
.....  ....,,,:;r5#5;i;isA39M9@;XG#rAG#hiAXir52r#9s.,,:;.@
,.......,,,,::;rh#A,isi;;XS;@@;h:#3S5AGB2,3X,,i@@@@iir;:;@
s;.:ri,...,,:;XHG; ,:;;i59s@@rBhM,rXMX@9i52. r@@:@@r:i,;.@
S2h@@@@@@h:,;XHArXA23MM2G23@@BXG@X@GM5@hX3. ;@@@@5@9;i:sA@
G@@@h, ;M@@@@@#M#Sh55A;,AG@9A@@S,#@2M@S,A...MS@@@@@@s::r@@
M:i5isrsX2;:AM5:ss;XG&@@@@hH2G@3h@@92r;A:   &i@@@@2@H;:.@@
s;s39riB,S.;h3rii,ss::;;,ir@@@@@@rA:A 2r,,.;@r@X@@@@H;;.@@
h5MBX2H3M3sr22@h2rrr,:MB@G@@B :A@@sGS9@G2si,B3#&2,si,;;s@@
   HH.rS9HiXG@@H2H#Gh@B55@@Gi.,@@2X@@@@sXh9@B2,. rA, ,;#@@
s;.XH25X:@@##Gr.2GBM@hMi&3ii:,9@HA@M,M@@GG9@BA;HB@@M:..@@@
2rr5#3MhBhX55A.sXh@@3As@5s25rh@@h9H:.h@BHhshhs;5S@@9:. @@h
XHsGHiB@@M,i;:;i;9@r22@s,ssXX@@Hr;3,M9@ihAiA2Xr;3M;...i@@i
Xi;r@@2srH@@@@55@@2XA@i.;s;.@@9h ,.,@@2s5S353M5sr:   ,h@@.
: h&3@@G#B@MsAMh2 :SS:.;s,.@@3#@h2&@@2#5X.. r;;S@X.,.,3@@@
@@#s;;:s35@@S5,s2:@@.; ;:;@@MB@93@@M:MHrA..,s,iSSirri;5M#@
@@#@@@#A3hH@9S@@@@hs55Xi @@@5H@G@@@i@G5: .;rr,s@H,:;,,hMsi
2@@@XrM@@@&;3HH@@@2,3M2s@@@2X@@@@A.H@;MArXi:irh@2   .;9Mi:
iA@@@,.;:,sB@@@@@#2,M@@@@G@@@@3.  s@hii,H@@#;.B@r . .r#5,,
@hsH@@r... ,sr:;rA25r.AB@#2,53MhA;@@:...;3h.&@9B,   .AMr::
@@@@@Bi;,  ,:,::,..;sXi::;.,:2hh2:@M,,    ..rrsi  ...GH:i,
:.i2A;,i;;ssri;::, .:;iiir5;,..:s2G3:.       s2:.,,,:h3MM5
XXi.., ::;rrXr;.;XXr;:::;:;sr::iXs;:,. ...:;,XA,.   :XX5GA
@@5rii;:,;.:ii:..:i:,ss:;.,:;rsi.r5MHM5X;,::,Xi ..., XMs53
2@@3sX252si:,:,..,;: ,;s:::;sXAis2552Xi.:X53MX .:;i:i,i,s5
 X@@r,.,:, :;rXsi:,.  :;sAAArX59@9h:,.;X25hGM:  .::i2XAAX#
ii#@A..:ii.,:. :rXX2Ai::;:i3&#Xr22M#G3X;,,:ri.   ..rHAiAri
. h@M,.  .:;.. .. ..,issr;, :Ah5AhS#9HA; ssX5HH2;, 2#s.,;;
,:M@A,,.. .: ::  .,,,,,,....,,ii;si;,  .:rXA252r.;r#B;,,,.
;h@9sri;,.;sr:.,.,,., ,;,.::,,,i,,;i:,,,.., .... ,;HG:,,.,
@@3 .,,.:ir; ,:;irssri;, .,. ..,rr,si::::;;:. .  :sS5,,:::
::i:....,,..:irr;, ....,:::. ,...:isr:,... ....,..sBM.iris
.:;ri:,::,,,. ..,;rsi::, .:;;,.,:,.,:;:..  .,.. .,:hS,:::X
 ,,.i;. .,. .,:... ,.:ii;ii,.:::,...,::,,:,,,,,. :G5rXi ,;
  ,;::: ...:;:,,,:,;: ...,:. ,,,,,,...,,,::,....,,H@@@@@2,
;;.. .. ,,..,. .  .,.... .:;:.  ....... ... ,:;iiA@M2MB@@@
ri..::,...,,.,..  .::.. .  .,,,, ........,,...   s#5i;:.iH
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
import os, colorsys
outdir = Path(os.environ['TEMP']) / 'codex_video_frames2'
path = outdir / '20230626_132021_2.ppm'
with open(path,'rb') as f:
    assert f.readline().strip()==b'P6'
    def tok():
        t=b''
        while True:
            c=f.read(1)
            if not c: return t
            if c==b'#': f.readline(); continue
            if c.isspace():
                if t: return t
                continue
            t+=c
    w,h,maxv=int(tok()),int(tok()),int(tok())
    data=f.read(w*h*3)

def cls(r,g,b):
    lum=0.299*r+0.587*g+0.114*b
    mx=max(r,g,b)/255
    mn=min(r,g,b)/255
    s=0 if mx==0 else (mx-mn)/mx
    h=colorsys.rgb_to_hsv(r/255,g/255,b/255)[0]*360
    if lum<50: return 'K' # dark
    if lum>200: return 'W'
    if 70<=h<=170 and s>0.2: return 'G'
    if 180<=h<=260 and s>0.2: return 'B'
    if r>95 and g>40 and b>20 and r>g and r>b and (max(r,g,b)-min(r,g,b)>15): return 'S'
    if s<0.15: return 'N'
    if h<30 or h>=330: return 'R'
    if 30<=h<70: return 'Y'
    return 'O'
# average blocks to 30x27
bw,bh=30,27
for by in range(bh):
    line=''
    y0=by*h//bh; y1=(by+1)*h//bh
    for bx in range(bw):
        x0=bx*w//bw; x1=(bx+1)*w//bw
        counts={}
        for y in range(y0,y1):
            for x in range(x0,x1):
                i=(y*w+x)*3
                c=cls(data[i],data[i+1],data[i+2])
                counts[c]=counts.get(c,0)+1
        line += max(counts, key=counts.get)
    print(line)
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 301ms:
SSSNNNNNNNSKKKKKKKKKKKKKNNWWNN
SSKNNNNNNNSKKKKKKKKKKKKNNNWBBB
KSKRKNNNNNSKKKKKKKKKKKKNNNNBBB
KRKKKKKNNNSKKKKKKKKKKKNNNNBBBW
KKKKKKKNNNNKKKKKKKKKKNNNNOBBBW
SKKKKKKNNNNKKKKKKKKKKNNNNBNBBB
KKKSSSSSSSBBBBBBBBBBNNNNNKKNKB
KKKKNNNNNSSSSSSSSSBBNNNNKKKKKN
KYYKNNNNNNBNSSSSSSSSSSSNSSWKKK
YYYYNNNNNONSSSSWWWWWNSSSSSWWWW
RKSSNNNNNSSSSSGWWNWWSSSSNNSSWN
SSSSSSSSSSSSSGOWWWBNSSSSWSSSWK
SSSSSSSSSSSSONOOKOOSSSSSSSSWWK
SSSSSSSNSSNGGGNKNOWWGSSSSSSSSK
SSSSSSSSSSGOKYKSWWWWGNNNNSSSSK
SSNGGGGSSGGKKKKSWWWGOSSNNSSSKN
SNBBBNGGGGKKKKSWWGGGSSSNSSSSWW
WWRSSSOBBKKKKSWGGGOBBBBBSSSSWW
NNNSSSSSSSSSSGGGGGBBBBBBSSSWWW
RSSSSSSSSSSSSSSSBBBBBBBBSSSNNW
WSSSSSSSSSSSSSSSSSSSSBBNSSSNON
WNSSSSSSSSSSSSSRSSSSSSSSSSSWWW
NNSSSSSSSSSSSSSSSSSSSSSSSSSWWW
NSSSSSSSSSSSSSSSSSSSSSSSSSWWWW
SSSSSSSSSSSSSSSSSSSSSSSSSSNWWN
SSSSSSSSSSSSSSSSSSSSSSSSSSNNWW
SSSSSSSSSSSSSSSSSSSSSSSSSSNNNN
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
import os, colorsys
outdir = Path(os.environ['TEMP']) / 'codex_video_frames2'

def read(path):
    with open(path,'rb') as f:
        assert f.readline().strip()==b'P6'
        def tok():
            t=b''
            while True:
                c=f.read(1)
                if not c: return t
                if c==b'#': f.readline(); continue
                if c.isspace():
                    if t: return t
                    continue
                t+=c
        w,h,maxv=int(tok()),int(tok()),int(tok())
        return w,h,f.read(w*h*3)

def cls(r,g,b):
    lum=0.299*r+0.587*g+0.114*b
    mx=max(r,g,b)/255
    mn=min(r,g,b)/255
    s=0 if mx==0 else (mx-mn)/mx
    h=colorsys.rgb_to_hsv(r/255,g/255,b/255)[0]*360
    if lum<50: return 'K'
    if lum>200: return 'W'
    if 70<=h<=170 and s>0.2: return 'G'
    if 180<=h<=260 and s>0.2: return 'B'
    if r>95 and g>40 and b>20 and r>g and r>b and (max(r,g,b)-min(r,g,b)>15): return 'S'
    if s<0.15: return 'N'
    if h<30 or h>=330: return 'R'
    if 30<=h<70: return 'Y'
    return 'O'

for base in ['20230619_230408','20230622_231747']:
    print('VIDEO', base)
    for frame in [2,3]:
        print('FRAME', frame)
        w,h,data=read(outdir/f'{base}_{frame}.ppm')
        bw,bh=30,27
        for by in range(bh):
            line=''
            y0=by*h//bh; y1=(by+1)*h//bh
            for bx in range(bw):
                x0=bx*w//bw; x1=(bx+1)*w//bw
                counts={}
                for y in range(y0,y1):
                    for x in range(x0,x1):
                        i=(y*w+x)*3
                        c=cls(data[i],data[i+1],data[i+2])
                        counts[c]=counts.get(c,0)+1
                line += max(counts, key=counts.get)
            print(line)
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 332ms:
VIDEO 20230619_230408
FRAME 2
ONNNNNNNNNNNNNNNNNNNNNNNOOBOOO
NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
RRRNNNNNNNNNNNNNNNNNRRRRRRSNNN
RRRRRNONNNNNNNNNNNRRRRSSSSSSSS
KKKKKKNNNNNNNNNNNRRRRKKKKKNKKR
KNNKKKKNNNNNNNNNNRRRKNKKRNRRKK
SSSSSRSNNNNNNNNNNNNRSSSSSSSSSS
SSSSSSSRRNNNNNNNNNNNNNNSSSSNNN
SSSSSSSRNNNNNNWNNNSNNNNNNNNNNN
SSSSSSSNNNNNNNWNNSSNNNNNNNNNNN
SSSSSSNONNNNNNNNNNSRNNNNNNNNNN
NNSSSNONNNNNNNNNNNSSNNNNNNNNNN
SSNNNNRNNNNNNNOWWNSNNNNNNNNNNN
SSSNNNNNNNNSSSNNNNNNNSNNNNNNNN
SSSSNNNNNNNNNNNNNNNNNNNNNNNNNK
KSSSSSSSSSSSNNNNNNNSSNNNNSSKKK
KKSSSSSSSSSSSSSSSSSSSSSSSNKKKK
KKKSSSSSSSSSSSSSSSSSSSSSKKKKKK
KKKKKSSSSSSSSSSSSSSSSSKKKKKKKK
KKKKKKKSSSSSSSNNNNNNKKKKKKKKKK
KKKKKKKRRSSSSSSSSKKKKKKKKKKKKK
KKKKKRRRSSSSSSSSRKKKKKKKKKKKKK
SKKKRRNRSSSSSSSSKRKKKKKKKKKKKK
RKRSSSSRSSSSSSSSSRKKKKKKKKKKKK
SRSSSSSSSSSSSSSSSKRKKKRKKKKKKK
SSRSSSSSSSSSSSSSSSSKSKSRKKKKKK
SSSRSSSSSSSSSSSSSSSKKSKKKKKKKK
FRAME 3
NNNNNNNNNNNNNNNNNNNNNNNNNOOBBO
NNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
RRRRNNNNNNNNNNNNNNNSRRRRRRRSSN
KKKKKKNOONNNNNNNNNRRSRKKKKNKKS
NNKKKKKNNNNNNNNNNSRRRNKKKKNSKK
RNNRKKKNNNNNNNNNNNRSRNNKKNSSRR
SSSSSSSNNNNNNNNNNNNNRSSSSSSSSS
SSSSSSSSNNNNNNNNNNNNNNNNNNNNNN
SSSSSSSSNNNNNNWWNNSNNNNNNNNNNN
SSSSSSSNONNNNNNWNNSSNNNNNNNNNN
NSSSSSNONNNNNNNNNNSSNNNNNNNNNN
NNNSSNONNNNNNNOWWNSSNNNNNNNNNN
SSNNNNSSSNNNNNOWWNSSNNNNNNNNNN
SSNNNNNNNNNSSNNNNNNNNSNNNNNNNN
KSSSNNNNNNNNNNNNNNNNNNNNNNNNNK
NKSSSSSSSSSSSSSSSSSSSSNNNSNKKK
KNKSSSSSSSSSSSSSSSSRRSSSNNKKKK
KKKKSSSSSSSSSSSSSSSSSSSSKKKKKK
KKKKKKSSSSSSSSSSSSSSSSKKKKKKKK
KKKKKKKSSSSSSSNNNNNNKKKKKKKKKK
KKKKKKKRRSSSSSSSSKKKKKKKKKKKKK
KKKKKKRRSSSSSSSSRKKKKKKKKKKKKK
SKKKKRKNSSSSSSSSKKKKKKKKKKKKKK
KKRSSRSKSSSSSSSSSKRKKKKKKKKKKK
SRSSSSSSSSSSSSSSSSRKKKRKKKKKKK
SSRSSSSSSSSSSSSSSSSKRKKSRKKKKK
SSSRSSSSSSSSSSSSSSSKRSKKKKKKKK
VIDEO 20230622_231747
FRAME 2
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
KKKKKKKKKKKKKKKKKKKKKKKSSSSKKK
KKKKKKKKKKKKKKKKKKKKSSSSSSSSSS
KKKKKKKKKKKKKKKKKKKSSSSSSSSRRR
KKKKKKKKKKKKKKKKKKKSSSSSSKSSSR
KKKKKKKKKKKKKKKKKKKSSSSSSSSKSS
KKKKKKKKKKKKKKKKKKKRSSSSSSSSSS
KKKKKKKKKKKKKKSSSSSSSSSSSSSSSS
KKKKKKKKKKKKSKSSSSSSSSSKKKKSSS
KKKKKKKKKKKKKKSSSSSKKSSSKKKKKS
KKKKKKKKKKKSKKSKKKKSKKSSSSSSSS
KKKKKKKKKKSSSKKKWSSKKKKSSSSSSK
KKKKKKKKKKSSKKKWSSSRRSSSSSSKKK
SSSSSSSSSSSSSSWSSSSWWSSSSSSKKK
SSSSSSSKKKKSSRKSSSSSSSSSSSSSSS
SSSSSSSSSSSSRRRRRSSSSSSSSSSSSS
SSSSSSSSSSSSSRSSKSSSSSSSSKSSSS
SSSSSSSSSSSSSSSKKSSKKKKKKSSSSS
SSSSSSSRSSSSSSKKKKKKKKSSSSSSSS
SSSSSSSSSSSSSSSKKSKKKSSSSSSSSS
SSSSSSSSSSSSSSSSSSSKSSSSSSSSSS
SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSSSSSSSSSSSSSSR
SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
SSSSSSSSSSSSSSSSSSSSSSSSRRRRRR
FRAME 3
KKKKKKKKKKKKKKKKKKKKKSSSSKKKKK
KKKKKKKKKKKKKKKKKKSSSSWSSSSKKK
KKKKKKKKKKKKKKKKKSSSSSSSSSSSSS
KKKKKKKKKKKKKKKKKSSSSSSSSSSSSS
KKKKKKKKKKKKKKKKSSSSSSKSSSSSSS
KKKKKKKKKKKKKKKKKKKSSSSSKSSSSS
KKKKKKKKKKKKKKKKRSSSSSSSSSWSSS
KKKKKSSSSSKKKKKKKSSSSSSSSSSSSS
KKKKKSSSSSSKKKKKSSSSKKKKSSKKKK
KKKKKKSSKSSKKKKKKSRSKKSSSSSSKK
KKSSKKKKSSSRKSSKKKSSKKKKKSSSKK
KKSRKKKKKKKKKSWWWNKKSSSSSSSKKR
KKRRYKWWWSRRWWWSSNSSSSSSSKKKKK
SSSSRSWSSRSWWWWSSSSSSKKKKKKKKK
SSSSKKRRSRSSSSSSSSSSSKKKKKKKKK
SSSSSSSSSSSSSSSSSSSSSSSKKKKKSS
SSSSSSSSSSRRRSWSSSSSSSSSRSSSSS
SSSSSSSSSSSSRSSSSSSSRSSSSSSSSS
SSSSSSSSSSSSKSKKSSKSSSSSSSSSSS
SSSSSSSSSRKKKKKKKKSSSSSSSSSSSS
SSSSSSSNNSSSKKKSSSSSSSSSSSSSSS
SSSSSSSSSSSSRKKSSSSSSSSSSSSSSS
SSSSSSSSSSSNSKSSSSSSSSSSSSSSSS
SSSSSSSSSKSSSKSSSSSSSSSSSSSSSS
SSSSSSSRKSSSSKSSSSSSSSSSSSSSSR
SSSSSSSRKSSSKSSSSRRSSRRSRSSRRR
SSSSSSSSKSSKKSSSSSRRRRRRRRRRRR
작업 파일을 읽고 3개 영상의 메타데이터와 대표 프레임 기반 분석을 진행합니다.
  ✓ analyze/_task.json 읽기 및 대상 영상 확인
  → 3개 영상 메타데이터 및 대표 프레임 점검
  • 요청된 마크다운 3개 작성
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
import json
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from fractions import Fraction
from pathlib import Path

root = Path(r'C:\\Users\\tokeii\\Desktop\\mp4')
task_path = root / 'analyze' / '_task.json'
with task_path.open('r', encoding='utf-8') as f:
    task = json.load(f)

content = {
    '20230619_230408.mp4': {
        'title': '어두운 세로 근접 클립',
        'summary': '약 2초 분량의 세로형 초단편 영상이다. 어두운 배경 앞에서 살색·갈색 계열의 근접 피사체가 화면 대부분을 차지하는 장면으로 추정된다.',
        'details': [
            '세로 구도의 매우 짧은 한 컷 영상으로 보임.',
            '중앙과 하단에 따뜻한 색조의 근접 피사체가 크게 잡혀 있다.',
            '배경은 어둡고 무채색 비중이 높아 저조도 환경처럼 보인다.',
            '짧은 시간 동안 구도 변화가 크지 않아 단일 동작 중심 클립으로 추정된다.'
        ],
        'categories': ['세로영상', '근접촬영', '저조도', '초단편'],
        'keywords': ['짧은 세로 영상', '어두운 장면', '근접 피사체', '따뜻한 색조']
    },
    '20230622_231747.mp4': {
        'title': '붉은 조명 근접 클립',
        'summary': '약 2.8초 분량의 세로형 영상이다. 화면 전반이 붉고 어두운 조명에 물들어 있으며, 따뜻한 색 계열의 피사체를 매우 가깝게 담은 장면으로 보인다.',
        'details': [
            '상단과 배경은 매우 어둡고, 중앙~하단에 붉은색·살색 계열 영역이 두드러진다.',
            '조명이 강하게 붉거나 주황빛으로 치우쳐 보여 색 대비가 강하다.',
            '피사체가 프레임 가까이에 있어 클로즈업 인상이 강하다.',
            '짧은 단일 장면이 이어지는 구성으로 추정된다.'
        ],
        'categories': ['세로영상', '근접촬영', '저조도', '붉은조명'],
        'keywords': ['붉은 조명', '어두운 클립', '클로즈업', '따뜻한 색감', '짧은 영상']
    },
    '20230626_132021.mp4': {
        'title': '밝은 자연광 근접 클립',
        'summary': '약 10초 분량의 세로형 영상이다. 밝은 자연광 또는 주간광 아래에서 따뜻한 색의 근접 피사체와 푸른색·녹색 배경 요소가 함께 보이는 연속 장면으로 추정된다.',
        'details': [
            '전면에는 살색·베이지 계열의 큰 피사체가 가까이 잡힌다.',
            '우측과 상단 일부에 푸른색·회색 배경이 보여 밝은 야외 또는 창가 환경처럼 보인다.',
            '중간중간 녹색 계열이 비쳐 배경 요소가 조금씩 바뀌는 듯하다.',
            '약 10초 동안 카메라와 피사체가 함께 움직이며 구도가 점진적으로 변한다.',
            '전반적으로 한 장면을 연속으로 촬영한 세로 클립에 가깝다.'
        ],
        'categories': ['세로영상', '근접촬영', '밝은장면', '자연광추정'],
        'keywords': ['밝은 세로 영상', '자연광 추정', '근접 피사체', '푸른 배경', '짧은 연속 촬영']
    }
}

def probe(video_path: Path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', str(video_path)],
        capture_output=True,
        text=True,
        encoding='utf-8',
        check=True,
    )
    data = json.loads(result.stdout)
    video_stream = next(s for s in data['streams'] if s.get('codec_type') == 'video')
    audio_stream = next((s for s in data['streams'] if s.get('codec_type') == 'audio'), None)
    rotation = 0
    for item in video_stream.get('side_data_list', []):
        if 'rotation' in item:
            rotation = int(item['rotation'])
            break
    width = int(video_stream['width'])
    height = int(video_stream['height'])
    if rotation in (90, -90, 270, -270):
        width, height = height, width
    fps_tag = data.get('format', {}).get('tags', {}).get('com.android.capture.fps')
    if fps_tag:
        fps = float(fps_tag)
    else:
        rate = video_stream.get('avg_frame_rate') or video_stream.get('r_frame_rate') or '0/1'
        fps = float(Fraction(rate)) if rate not in ('0/0', '0') else 0.0
    duration = float(data['format']['duration'])
    return {
        'durationSeconds': round(duration, 2),
        'width': width,
        'height': height,
        'fps': int(round(fps)) if abs(fps - round(fps)) < 0.05 else round(fps, 2),
        'hasAudio': audio_stream is not None,
    }

kst = timezone(timedelta(hours=9))
generated_at = datetime.now(kst).replace(microsecond=0).isoformat()

for item in task.get('pendingVideos', []):
    file_name = item['fileName']
    video_path = root / Path(item['source'])
    output_path = root / Path(item['outputMarkdown'])
    meta = probe(video_path)
    body = content[file_name]
    payload = {
        'schemaVersion': 1,
        'source': item['source'].replace('\\\\', '/'),
        'fileName': file_name,
        'title': body['title'],
        'summary': body['summary'],
        'details': body['details'],
        'categories': body['categories'],
        'keywords': body['keywords'],
        'durationSeconds': meta['durationSeconds'],
        'width': meta['width'],
        'height': meta['height'],
        'fps': meta['fps'],
        'hasAudio': meta['hasAudio'],
        'sampleImage': '',
        'generatedAt': generated_at,
        'model': 'gpt-5.4',
        'reasoningEffort': 'xhigh',
    }
    lines = [
        f\"# {body['title']}\",
        '',
        '"'```json'"',
        json.dumps(payload, ensure_ascii=False, indent=2),
        '"'```'"',
        '',
        '## 기본 정보',
        f\"- 소스: "'`{item['"'source'].replace('\\\\', '/')}"'`",
        f"- 파일명: `{file_name}`",
        f"- 길이: 약 {meta['"'durationSeconds']}초\",
        f\"- 해상도: {meta['width']}x{meta['height']}\",
        f\"- 프레임레이트: {meta['fps']}fps\",
        f\"- 오디오: {'있음' if meta['hasAudio'] else '없음'}\",
        '',
        '## 요약',
        body['summary'],
        '',
        '## 눈에 띄는 장면',
    ]
    lines.extend(f'- {detail}' for detail in body['details'])
    lines.extend([
        '',
        '## 태그',
        ', '.join(body['categories'])
    ])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text('\\n'.join(lines) + '\\n', encoding='utf-8')

for tmp_name in ['codex_video_frames', 'codex_video_frames2']:
    tmp_path = Path(__import__('os').environ.get('TEMP', '')) / tmp_name
    if tmp_path.exists():
        shutil.rmtree(tmp_path, ignore_errors=True)

print(len(task.get('pendingVideos', [])))
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 643ms:
3
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
from pathlib import Path
paths = [
    Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_library\\videos\\20230619_230408_mp4__videos.md'),
    Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_library\\videos\\20230622_231747_mp4__videos.md'),
    Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_library\\videos\\20230626_132021_mp4__videos.md'),
]
for p in paths:
    print(p.name, p.exists(), p.stat().st_size if p.exists() else -1)
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 306ms:
20230619_230408_mp4__videos.md True 1249
20230622_231747_mp4__videos.md True 1276
20230626_132021_mp4__videos.md True 1418
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
import json, re
from pathlib import Path
paths = [
    Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_library\\videos\\20230619_230408_mp4__videos.md'),
    Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_library\\videos\\20230622_231747_mp4__videos.md'),
    Path(r'C:\\Users\\tokeii\\Desktop\\mp4\\analyze\\_library\\videos\\20230626_132021_mp4__videos.md'),
]
for p in paths:
    text = p.read_text(encoding='utf-8')
    ok = all(section in text for section in ['## 기본 정보','## 요약','## 눈에 띄는 장면','## 태그'])
    m = re.search(r'"'```json'"\\n(.*?)\\n"'```'"', text, re.S)
    payload = json.loads(m.group(1)) if m else None
    print(p.name, ok, payload['fileName'], payload['width'], payload['height'], payload['fps'], payload['hasAudio'])
'@ | python -" in C:\Users\tokeii\Desktop\mp4
 succeeded in 314ms:
20230619_230408_mp4__videos.md True 20230619_230408.mp4 2160 3840 60 True
20230622_231747_mp4__videos.md True 20230622_231747.mp4 2160 3840 60 True
20230626_132021_mp4__videos.md True 20230626_132021.mp4 2160 3840 30 True
3개 영상의 메타데이터와 대표 프레임 기반 요약을 바탕으로 요청된 마크다운 파일 작성을 마쳤습니다.
  ✓ analyze/_task.json 읽기 및 대상 영상 확인
  ✓ 3개 영상 메타데이터 및 대표 프레임 점검
  ✓ 요청된 마크다운 3개 작성
codex
새로 3개 영상을 분석해 요청된 마크다운 3개를 생성했습니다.
대상은 `_task.json`에 있는 pending 항목만 처리했습니다.
`analyze/results.json`, `analyze/index.md`, 프리뷰 영상, 영구 샘플 이미지는 생성·수정하지 않았습니다.
tokens used
56,261
새로 3개 영상을 분석해 요청된 마크다운 3개를 생성했습니다.
대상은 `_task.json`에 있는 pending 항목만 처리했습니다.
`analyze/results.json`, `analyze/index.md`, 프리뷰 영상, 영구 샘플 이미지는 생성·수정하지 않았습니다.