
using System.Collections;
using UnityEngine;

namespace AgentsExample
{
    [RequireComponent(typeof(Camera), typeof(Animator))]
    public class CameraController : MonoBehaviour
    {
        private Animator _animator;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
        }

        public IEnumerator ZoomIn()
        {
            yield return AnimateToState("ZoomedOut");
        }

        public IEnumerator ZoomOut()
        {
            yield return AnimateToState("ZoomedIn");
        }

        private IEnumerator AnimateToState(string stateName)
        {
            int stateHash = Animator.StringToHash(stateName);
            _animator.CrossFade(stateHash, 0.25f);

            while (_animator.GetCurrentAnimatorStateInfo(0).shortNameHash != stateHash)
                yield return null;
            while (_animator.GetCurrentAnimatorStateInfo(0).normalizedTime < 1f)
                yield return null;
        }
    }
}