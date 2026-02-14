const git = require('isomorphic-git')
const fs = require('fs')
const path = require('path')

const dir = process.cwd()

async function run() {
    console.log('Adding files...')
    await git.add({ fs, dir, filepath: '.' })

    try {
        console.log('Removing .eslintrc.json...')
        await git.remove({ fs, dir, filepath: '.eslintrc.json' })
    } catch (e) {
        console.log('.eslintrc.json not found or already removed')
    }

    console.log('Committing...')
    await git.commit({
        fs,
        dir,
        author: {
            name: 'KandyDrops Agent',
            email: 'agent@kandydrops.com',
        },
        message: 'feat: setup surgeon-level visual tooling (react-scan, playwright, eslint)'
    })
    console.log('Committed successfully')
}
run().catch(err => console.error(err))
