export const POSES = ["Front View", "3/4 View", "Profile", "Action", "Sitting"]

const POSE_DIRECTIVES: Record<string, string> = {
  "Front View": "full-body front view, facing the viewer directly, symmetrical stance",
  "3/4 View": "three-quarter view, body turned roughly 45 degrees from the viewer",
  Profile: "side profile view, body and face turned 90 degrees from the viewer",
  Action: "dynamic action pose, mid-movement with strong line of action and foreshortening",
  Sitting: "seated pose, full body visible, relaxed natural posture",
}

export function poseDirective(pose: string | undefined): string | null {
  return (pose && POSE_DIRECTIVES[pose]) || null
}
