#!/usr/bin/env python3
"""Deploy / update the PropFlow splat-trainer endpoint on RunPod Serverless.

Reads RUNPOD_API_KEY from the environment (never accepts it as a CLI argument
so it doesn't leak into process listings or shell history).

Usage:
    # First-time deploy (creates a new endpoint):
    python deploy_runpod.py create \\
        --image ghcr.io/cc90210/propflow-splat-trainer:latest \\
        --webhook-secret-env-name WALKTHROUGH_WEBHOOK_SECRET \\
        --r2-account-id-env-name R2_ACCOUNT_ID \\
        --r2-access-key-env-name R2_ACCESS_KEY_ID \\
        --r2-secret-env-name R2_SECRET_ACCESS_KEY

    # Show current state:
    python deploy_runpod.py list

    # Update image on existing endpoint:
    python deploy_runpod.py update --endpoint-id <ID> --image <new tag>

After 'create', set RUNPOD_ENDPOINT_ID in PropFlow's Vercel env vars to the
ID printed at the end.

Reference: https://docs.runpod.io/serverless/endpoints/manage-endpoints
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

GRAPHQL_URL = 'https://api.runpod.io/graphql'
DEFAULT_GPU_TYPES = [
    'NVIDIA GeForce RTX 4090',
    'NVIDIA L40S',
]
DEFAULT_NAME = 'propflow-splat-trainer'
DEFAULT_MIN_WORKERS = 0
DEFAULT_MAX_WORKERS = 1
DEFAULT_IDLE_TIMEOUT_S = 5
DEFAULT_EXECUTION_TIMEOUT_S = 2400  # 40 min — comfortable margin over typical 15 min training


def _api_key() -> str:
    key = os.environ.get('RUNPOD_API_KEY')
    if not key:
        sys.exit('ERROR: RUNPOD_API_KEY not set. Load .env.agents first.')
    return key


def _post(query: str, variables: dict | None = None) -> dict:
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=body,
        method='POST',
        headers={
            'Authorization': f'Bearer {_api_key()}',
            'Content-Type': 'application/json',
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as exc:
        sys.exit(f'RunPod API HTTP {exc.code}: {exc.read().decode()}')
    data = json.loads(resp.read())
    if 'errors' in data and data['errors']:
        sys.exit(f'RunPod GraphQL errors: {json.dumps(data["errors"])}')
    return data['data']


def cmd_list(_args: argparse.Namespace) -> None:
    data = _post(
        '''query { myself { serverlessDiscount { discountFactor type } endpoints {
            id name templateId workersMin workersMax idleTimeout
            scalerType scalerValue gpuIds locations
        } } }'''
    )
    endpoints = data.get('myself', {}).get('endpoints', []) or []
    if not endpoints:
        print('No serverless endpoints found.')
        return
    print(f'{"ID":24s} {"Name":35s} {"Workers":15s} GPUs')
    for e in endpoints:
        wid = f'{e.get("workersMin")}-{e.get("workersMax")}'
        gpus = (e.get('gpuIds') or '')[:60]
        print(f'{e["id"]:24s} {e["name"][:35]:35s} {wid:15s} {gpus}')


def _resolve_env_value(name: str) -> str:
    """Read an env var by name. Used for passing PropFlow's secrets into
    the RunPod endpoint config without echoing the value."""
    val = os.environ.get(name)
    if not val:
        sys.exit(f'ERROR: env var {name!r} not set — load .env.agents first.')
    return val


def cmd_create(args: argparse.Namespace) -> None:
    env_vars = []
    for cli_arg, env_name_attr in [
        ('webhook_secret_env_name', 'WALKTHROUGH_WEBHOOK_SECRET'),
        ('r2_account_id_env_name', 'R2_ACCOUNT_ID'),
        ('r2_access_key_env_name', 'R2_ACCESS_KEY_ID'),
        ('r2_secret_env_name', 'R2_SECRET_ACCESS_KEY'),
    ]:
        local_name = getattr(args, cli_arg, None) or env_name_attr
        value = _resolve_env_value(local_name)
        env_vars.append({'key': env_name_attr, 'value': value})

    template_mutation = '''
        mutation saveTemplate($input: SaveTemplateInput!) {
            saveTemplate(input: $input) { id name imageName }
        }
    '''
    template = _post(template_mutation, {
        'input': {
            'name': args.name + '-template',
            'imageName': args.image,
            'dockerArgs': '',
            'containerDiskInGb': 30,
            'volumeInGb': 0,
            'env': env_vars,
            'isServerless': True,
            'readme': 'PropFlow Gaussian Splat trainer — COLMAP + gsplat pipeline',
        },
    })
    template_id = template['saveTemplate']['id']
    print(f'Template created: {template_id}')

    endpoint_mutation = '''
        mutation saveEndpoint($input: EndpointInput!) {
            saveEndpoint(input: $input) {
                id name templateId workersMin workersMax idleTimeout gpuIds
            }
        }
    '''
    gpu_ids = ','.join(args.gpu_types or DEFAULT_GPU_TYPES)

    endpoint = _post(endpoint_mutation, {
        'input': {
            'name': args.name,
            'templateId': template_id,
            'gpuIds': gpu_ids,
            'workersMin': args.min_workers,
            'workersMax': args.max_workers,
            'idleTimeout': args.idle_timeout,
            'scalerType': 'QUEUE_DELAY',
            'scalerValue': 4,
            'locations': args.locations,
        },
    })

    ep = endpoint['saveEndpoint']
    print()
    print('=' * 70)
    print(f'  ENDPOINT CREATED')
    print('=' * 70)
    print(f'  ID:           {ep["id"]}')
    print(f'  Name:         {ep["name"]}')
    print(f'  Workers:      {ep["workersMin"]}–{ep["workersMax"]}')
    print(f'  Idle timeout: {ep["idleTimeout"]}s')
    print()
    print('  Next: set RUNPOD_ENDPOINT_ID on PropFlow Vercel env vars:')
    print(f'    python scripts/vercel_env_tool.py set --project real-estate-app \\\\')
    print(f'      --key RUNPOD_ENDPOINT_ID --value {ep["id"]} \\\\')
    print(f'      --env "production,preview,development"')
    print('=' * 70)


def cmd_update(args: argparse.Namespace) -> None:
    sys.exit(
        'Update is intentionally a no-op for the image. To roll a new image:\n'
        ' 1. Push a new tag to ghcr.io (GitHub Actions does this automatically)\n'
        ' 2. RunPod will pull the new :latest on the next cold-start worker\n'
        '\n'
        'To force-update other settings (workers, GPUs, etc.), use the dashboard\n'
        'or extend this script with the updateEndpoint mutation.'
    )


def main() -> None:
    parser = argparse.ArgumentParser(description='Deploy/manage PropFlow splat-trainer on RunPod Serverless')
    sub = parser.add_subparsers(dest='cmd', required=True)

    sub.add_parser('list').set_defaults(func=cmd_list)

    create = sub.add_parser('create', help='Create a new serverless endpoint')
    create.add_argument('--image', required=True, help='Docker image URL (e.g. ghcr.io/cc90210/propflow-splat-trainer:latest)')
    create.add_argument('--name', default=DEFAULT_NAME)
    create.add_argument('--gpu-types', nargs='+', default=DEFAULT_GPU_TYPES)
    create.add_argument('--min-workers', type=int, default=DEFAULT_MIN_WORKERS)
    create.add_argument('--max-workers', type=int, default=DEFAULT_MAX_WORKERS)
    create.add_argument('--idle-timeout', type=int, default=DEFAULT_IDLE_TIMEOUT_S)
    create.add_argument('--locations', default='US,CA-MTL,EU-RO,EUR-IS-1,EUR-NO-1', help='Comma-sep region preferences')
    create.add_argument('--webhook-secret-env-name', default='WALKTHROUGH_WEBHOOK_SECRET',
                        help='Name of the local env var holding the webhook secret')
    create.add_argument('--r2-account-id-env-name', default='R2_ACCOUNT_ID')
    create.add_argument('--r2-access-key-env-name', default='R2_ACCESS_KEY_ID')
    create.add_argument('--r2-secret-env-name', default='R2_SECRET_ACCESS_KEY')
    create.set_defaults(func=cmd_create)

    update = sub.add_parser('update', help='Update existing endpoint config')
    update.add_argument('--endpoint-id', required=True)
    update.add_argument('--image')
    update.set_defaults(func=cmd_update)

    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
