/*
 * Copyright 2025 LiveKit
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import LiveKit
import UIKit

// enter your own LiveKit server url and token
let url = "ws://localhost:7880"
let token = "your token"

class RoomViewController: UIViewController {
    private lazy var room: Room = .init(delegate: self)

    private lazy var collectionView: UICollectionView = {
        print("creating UICollectionView...")
        let r = UICollectionView(frame: .zero, collectionViewLayout: UICollectionViewFlowLayout())
        r.backgroundColor = .black
        r.register(ParticipantCell.self, forCellWithReuseIdentifier: ParticipantCell.reuseIdentifier)
        r.delegate = self
        r.dataSource = self
        r.alwaysBounceVertical = true
        r.contentInsetAdjustmentBehavior = .never
        return r
    }()

    private var remoteParticipants = [RemoteParticipant]()

    private var cellReference = NSHashTable<ParticipantCell>.weakObjects()
    private var timer: Timer?

    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)

        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true, block: { [weak self] _ in
            guard let self else { return }
            reComputeVideoViewEnabled()
        })
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        timer?.invalidate()
        timer = nil
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        collectionView.frame = view.bounds
        collectionView.collectionViewLayout.invalidateLayout()
    }

    override func loadView() {
        super.loadView()
        view.addSubview(collectionView)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        Task {
            await updateNavigationBar()
        }
    }

    @MainActor
    private func setParticipants() async {
        remoteParticipants = Array(room.remoteParticipants.values)
        collectionView.reloadData()
        await updateNavigationBar()
    }

    @MainActor
    private func updateNavigationBar() async {
        navigationItem.title = nil
        navigationItem.leftBarButtonItem = nil
        navigationItem.rightBarButtonItem = nil

        switch room.connectionState {
        case .connecting:
            navigationItem.title = "Connecting..."
        case .reconnecting:
            navigationItem.title = "Re-Connecting..."
        case .connected:
            navigationItem.title = "\(room.name ?? "No name") (\(room.remoteParticipants.count))"
            navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Disconnect",
                                                               style: .plain,
                                                               target: self,
                                                               action: #selector(onTapDisconnect(sender:)))
            navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Shuffle",
                                                                style: .plain,
                                                                target: self,
                                                                action: #selector(onTapShuffle(sender:)))
        case .disconnecting:
            navigationItem.title = "Disconnecting..."
        case .disconnected:
            navigationItem.title = "Disconnected"
            navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Connect",
                                                               style: .plain,
                                                               target: self,
                                                               action: #selector(onTapConnect(sender:)))
        }
    }

    @MainActor
    @objc func onTapConnect(sender _: UIBarButtonItem) {
        navigationItem.leftBarButtonItem?.isEnabled = false

        let roomOptions = RoomOptions(
            adaptiveStream: true,
            dynacast: true
        )

        Task {
            do {
                try await room.connect(url: url, token: token, roomOptions: roomOptions)
                print("connected to server version: \(String(describing: room.serverVersion))")
                await setParticipants()
            } catch {
                print("failed to connect with error: \(error)")
                await updateNavigationBar()
            }
        }
    }

    @MainActor
    @objc func onTapDisconnect(sender _: UIBarButtonItem) {
        navigationItem.leftBarButtonItem?.isEnabled = false

        Task {
            await room.disconnect()
            await updateNavigationBar()
        }
    }

    @MainActor
    @objc func onTapShuffle(sender _: UIBarButtonItem) {
        remoteParticipants.shuffle()
        collectionView.reloadData()
    }
}

extension RoomViewController: RoomDelegate {
    func room(_: Room, didUpdateConnectionState connectionState: ConnectionState, from _: ConnectionState) {
        print("connection state did update")

        Task { @MainActor in
            if case .disconnected = connectionState {
                remoteParticipants = []
                collectionView.reloadData()
            }

            await updateNavigationBar()
        }
    }

    func room(_: Room, participantDidConnect _: RemoteParticipant) {
        print("participant did join")
        Task { @MainActor in
            await setParticipants()
        }
    }

    func room(_: Room, participantDidDisconnect _: RemoteParticipant) {
        print("participant did leave")
        Task { @MainActor in
            await setParticipants()
        }
    }
}

extension RoomViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(_ collectionView: UICollectionView, layout _: UICollectionViewLayout, sizeForItemAt _: IndexPath) -> CGSize {
        print("sizeForItemAt...")

        let columns: CGFloat = 2
        let size = collectionView.bounds.width / columns
        return CGSize(width: size, height: size)
    }

    func collectionView(_: UICollectionView, layout _: UICollectionViewLayout, insetForSectionAt _: Int) -> UIEdgeInsets {
        .zero
    }

    func collectionView(_: UICollectionView, layout _: UICollectionViewLayout, minimumLineSpacingForSectionAt _: Int) -> CGFloat {
        0
    }

    func collectionView(_: UICollectionView, layout _: UICollectionViewLayout, minimumInteritemSpacingForSectionAt _: Int) -> CGFloat {
        0
    }

    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        print("didSelectItemAt: \(indexPath)")
        collectionView.reloadItems(at: collectionView.indexPathsForVisibleItems)
    }

    func reComputeVideoViewEnabled() {
        let visibleCells = collectionView.visibleCells.compactMap { $0 as? ParticipantCell }
        let offScreenCells = cellReference.allObjects.filter { !visibleCells.contains($0) }

        for cell in visibleCells.filter({ !$0.videoView.isEnabled }) {
            print("setting cell#\(cell.cellId) to true")
            cell.videoView.isEnabled = true
        }

        for cell in offScreenCells.filter(\.videoView.isEnabled) {
            print("setting cell#\(cell.cellId) to false")
            cell.videoView.isEnabled = false
        }
    }
}

extension RoomViewController: UICollectionViewDataSource {
    func collectionView(_: UICollectionView, numberOfItemsInSection _: Int) -> Int {
        // total number of participants to show (including local participant)
        print("numberOfItemsInSection...")
        return remoteParticipants.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ParticipantCell.reuseIdentifier,
                                                      for: indexPath)

        if let cell = cell as? ParticipantCell {
            // keep weak reference to cell
            cellReference.add(cell)

            if indexPath.row < remoteParticipants.count {
                let participant = remoteParticipants[indexPath.row]
                cell.participant = participant
            }
        }

        return cell
    }
}
