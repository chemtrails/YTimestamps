let timestamps = []
let panels
let panel
let video
let videoId
let input
let attached = false
let enabled = true
let openButton
let timeout

chrome.storage.local.get('enabled', res => {
    if (res.enabled !== undefined) enabled = res.enabled
})

const observer = new MutationObserver(onMutations)
observer.observe(document.body, { childList: true })

function onMutations() {
    video = document.querySelector('video')
    panels = document.getElementById('panels')
    const id = new URLSearchParams(location.search).get('v')
    const settings = document.querySelector('.ytp-panel-menu')

    if (location.pathname !== '/watch' ||
        video === null ||
        panels === null ||
        videoId === null ||
        settings === null ||
        id === null
    ) {
        if (attached === true) closeTimestampsPanel()
        return
    }

    if (videoId !== id) {
        videoId = id

        chrome.storage.local.get(videoId, res => {
            if (res[videoId]) timestamps = res[videoId]
            else timestamps = []
        })

        openButton = document.getElementById('__timestamps-open-button__')

        if (openButton === null) {
            settings.insertAdjacentHTML('beforeend', `
                <div id="__timestamps-open-button__" class="ytp-menuitem" aria-checked="false" role="menuitemcheckbox" tabindex="0">
                    <div class="ytp-menuitem-icon">
                        <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg">
                            <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 7.5h7"/>
                                <path d="m7.498 11.5h6.669"/>
                                <path d="m7.498 9.5h5.002"/>
                                <path d="m9.498 13.5h8.002"/>
                            </g>
                        </svg>
                    </div>
                    <div class="ytp-menuitem-label">Timestamps</div>
                    <div class="ytp-menuitem-content">
                        <div class="ytp-menuitem-toggle-checkbox"></div>
                    </div>
                </div>`
            )

            openButton = document.getElementById('__timestamps-open-button__')

            openButton.addEventListener('click', e => {
                if (enabled === false) {
                    openButton.setAttribute('aria-checked', 'true')
                    openTimestampsPanel()
                    enabled = true
                    chrome.storage.local.set({ enabled: enabled })
                } else {
                    openButton.setAttribute('aria-checked', 'false')
                    closeTimestampsPanel()
                    enabled = false
                    chrome.storage.local.set({ enabled: enabled })
                }
            })
        }

        if (enabled === true) {
            openButton.setAttribute('aria-checked', 'true')

            // idk why
            timeout = setTimeout(openTimestampsPanel, 500)
        }
    }
}

function openTimestampsPanel() {
    if (panels.contains(panel)) return
    panels = document.getElementById('panels')
    panel = document.createElement('div')
    const inputWrapper = document.createElement('div')
    input = document.createElement('input')
    const createButton = document.createElement('div')

    panel.id = '__timestamps-panel__'
    input.placeholder = 'New timestamp...'
    inputWrapper.classList.add('__timestamps-input-wrapper__')
    createButton.classList.add('__timestamps-button__')
    createButton.innerHTML = `
    <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5.5 10.5h10"/><path d="m10.5 5.5v10"/></g></svg>`

    input.addEventListener('keyup', e => {
        if (e.key !== 'Enter') return
        pushTimestamp()
    })

    video.addEventListener('timeupdate', e => {
        let ct = new Date(video.currentTime * 1000).toISOString().slice(11, 19)
        if (ct.startsWith('00:')) ct = ct.replace('00:', '')
        if (ct) input.placeholder = `New timestamp at ${ct}`

        for (let i = 0; i < timestamps.length; i++) {
            let stamp = timestamps[i]
            const res = stamp.time - video.currentTime
            let el = panel.children[i + 1]
            if (el === undefined) return

            if (res < -2) {
                el.classList.add('__timestamps-before__')
                el.classList.remove('__timestamps-selected__')
            } else if (res < 2) {
                el.classList.add('__timestamps-selected__')
                el.classList.remove('__timestamps-before__')
            } else {
                el.classList.remove('__timestamps-before__')
                el.classList.remove('__timestamps-selected__')
            }
        }
    })

    createButton.addEventListener('click', pushTimestamp)
    inputWrapper.append(input)
    inputWrapper.append(createButton)
    panel.append(inputWrapper)
    if (timestamps) buildList()
    panels.prepend(panel)
    attached = true
}

function buildList() {
    timestamps.forEach(stamp => {
        const el = createTimestamp(stamp)
        panel.append(el)
    })
}

function insertTimestamp(stamp, index) {
    const el = createTimestamp(stamp)
    panel.insertBefore(el, panel.children[index + 1])
}

function createTimestamp(stamp) {
    const el = document.createElement('div')
    const note = document.createElement('input')
    const time = document.createElement('div')
    const deleteButton = document.createElement('div')
    const wrapper2 = document.createElement('div')

    deleteButton.classList.add('__timestamps-delete-button__')
    wrapper2.classList.add('__timestamps-wrapper__')
    el.classList.add('__timestamps-list-element__')
    time.classList.add('__timestamps-time__')
    note.classList.add('__timestamps-input__')

    note.value = stamp.note
    let d = new Date(stamp.time * 1000).toISOString().slice(11, 19)
    if (d.startsWith('00:')) d = d.replace('00:', '')
    time.textContent = d

    time.addEventListener('click', () => video.currentTime = stamp.time)

    note.addEventListener('input', () => {
        stamp.note = note.value
        updateStore()
    })

    deleteButton.addEventListener('click', () => {
        el.remove()
        timestamps.splice(timestamps.indexOf(stamp), 1);
        updateStore()
    })

    deleteButton.innerHTML = `
    <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(5 5)">
            <path d="m10.5 10.5-10-10z"/>
            <path d="m10.5.5-10 10"/>
        </g>
    </svg>`

    wrapper2.append(time)
    wrapper2.append(note)
    el.append(wrapper2)
    el.append(deleteButton)
    return el
}

function pushTimestamp() {
    const stamp = {
        time: video.currentTime,
        note: input.value
    }

    input.value = ''
    timestamps.push(stamp)
    timestamps.sort((a, b) => { return a.time - b.time })
    const index = timestamps.indexOf(stamp)
    insertTimestamp(stamp, index)
    updateStore()
}

function closeTimestampsPanel() {
    clearTimeout(timeout)
    panel.remove()
    attached = false
}

function updateStore() {
    let obj = {}
    obj[videoId] = timestamps
    chrome.storage.local.set(obj)
}