module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', {
      parserOpts: {
        headerPattern: /^(\w+)(?:\(([^)\r\n]+)\))?(!)?:?\s+(.+)$/,
        headerCorrespondence: ['type', 'scope', 'breaking', 'subject']
      },
      releaseRules: [
        { type: 'feat', release: 'minor' },
        { type: 'fix', release: 'patch' },
        { type: 'perf', release: 'patch' },
        { type: 'update', release: 'patch' },
        { breaking: '!', release: 'major' }
      ]
    }],
    ['@semantic-release/release-notes-generator', {
      parserOpts: {
        headerPattern: /^(\w+)(?:\(([^)\r\n]+)\))?(!)?:?\s+(.+)$/,
        headerCorrespondence: ['type', 'scope', 'breaking', 'subject']
      }
    }],
    '@semantic-release/changelog',
    ['@semantic-release/npm', { npmPublish: false }],
    ['@semantic-release/git', {
      assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }]
  ]
};
