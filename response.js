/*
 * 카카오톡 봇 - 독립형 - 멤버시
 *
 * 사용 / 수정 / 배포 전에 아래 주소의 글을 읽어보세요!
 * https://gitlab.com/mjy-hobby/kakaotalk-bot/standalone/member-clock
 */

let commands = {}; // commands[방 이름][보낸 메시지]에 명령어를 저장함

function list_members(members) // 멤버시 목록
{
	let ret = "";
	for(let i = 0; i < members.length; i++)
	{
		if(i) ret += "\n"; // 첫번째가 아니면 줄바꿈부터
		ret += members[i][0][0] + "시는 " + members[i][1] + "시 " + members[i][2] + "분입니다.";
	}
	return ret;
}

function bmc_add(room, prefix, members, func) // 방에 명령어 추가
{
	if(!commands[room]) // 방 없으면 초기화
	{
		commands[room] = {};
	} // 정보 명령어
	commands[room][prefix + "정보"] = "독립형 멤버시 봇입니다.\n자세한 정보는 https://gitlab.com/mjy-hobby/kakaotalk-bot/standalone/member-clock 에서 확인하실 수 있습니다.";
	for(let i = 0; i < members.length; i++) // 멤버별로
	{
		for(let j = 0; j < members[i][0].length; j++) // 모든 이름, 별명에 대한 데이터 추가
		{
			if(!commands[room][prefix + members[i][0][j] + "시"])
			{ // 이름이나 별명이 같을 수도 있으므로 배열로 저장
				commands[room][prefix + members[i][0][j] + "시"] = [];
			}
			commands[room][prefix + members[i][0][j] + "시"].push(members[i]);
		}
	}
	commands[room][prefix + "멤버시"] = func; // 멤버시 명령어
	commands[room][prefix + "멤버시 목록"] = list_members(members); // 멤버시 목록 명령어
}

function time_remain(time, sec) // (초 단위) sec부터 (분 단위) time까지 남은 시간 (초 단위)
{
	let ret = time * 60 - sec; // 단위 통일(분 단위의 time을 초 단위로)하고 현재 시간(sec)을 뺌
	return ret < 0 ? ret + 43200 : ret; // 남은 시간이 0보다 작으면 12시간(43200초) 더함
}

function find_earliest(members, min) // 현재 시간(분 단위)에서 가장 가까운 다음 멤버시가 멤버 목록(members)에서 몇 번째인지
{
	const len = members.length;
	for(let i = 0; i < len; i++)
	{
		if(members[i][3] > min) // 현재 시간이 해당 멤버시를 지났으면 패스
		{
			return i;
		}
	}
	return 0; // 전부 패스했으면 다음 멤버시는 첫번째
}

function getMessage1(names, h, m, remains) // memberClock이 너무 길어져서 분리
{
	let ret = names.join("시, ") + "시(" + h + "시 " + m + "분)까지 약 ";
	let s = remains % 60;
	m = (remains = Math.floor(remains / 60)) % 60;
	h = Math.floor(remains / 60);
	if(h) ret += h + "시간 ";
	if(m) ret += m + "분 ";
	ret += s + "초 남았습니다.";
	return ret;
}

function getMessageN(members) // response에서 바로 호출될 함수
{
	let now = new Date();
	let n = (((now.getHours() + 11) % 12 + 1) * 60 + now.getMinutes()) * 60 + now.getSeconds();
	let ret = "";
	for(let i = 0; i < members.length; i++)
	{
		if(i) ret += ", ";
		ret += members[i][0][0] + "시(" + members[i][1] + "시 " + members[i][2] + "분)까지 약 ";
		let remains = time_remain(members[i][3], n);
		let s = remains % 60;
		let m = (remains = Math.floor(remains / 60)) % 60;
		let h = Math.floor(remains / 60);
		if(h) ret += h + "시간 ";
		if(m) ret += m + "분 ";
		ret += s + "초";
	}
	return ret + " 남았습니다."
}

function memberClock(members) // 멤버시 명령어
{
	const now = new Date();
	let n = ((now.getHours() + 11) % 12 + 1) * 60 + now.getMinutes();
	let idx = find_earliest(members, n);
	let temp = members[idx]; // 멤버의 정보를 임시로 저장
	let tmp = [temp[0][0]]; // 생일이 같은 멤버가 여러명일 수 있으므로 배열로
	while(members[++idx] && members[idx][3] == temp[3])
	{ // 다음 멤버가 있고, 다음 멤버도 생일이 같으면 배열에 추가
		tmp.push(members[idx][0][0]);
	} // 답장할 내용을 반환
	return getMessage1(tmp, temp[1], temp[2], time_remain(temp[3], n * 60 + now.getSeconds()));
}

function getFunction(members) // members가 값이 아니라 참조라서... 이런 이상한 구조가 필요
{ // 다른 방법으로 해결할 수도 있긴 한데, 명령어 타입을 typeof만으로 구분하고 싶었음 (귀차니즘)
	return function ()
	{
		return memberClock(members);
	};
}

function response(room, msg, sender, isGroupChat, replier, imageDB)
{ // 앞, 뒤 공백이 붙어서 나오는 경우가 있을 수 있으므로 trim 처리
	room = room.trim();
	msg = msg.trim();
	if(commands[room]) // 명령어가 있는 방이면
	{
		switch(typeof commands[room][msg]) // 명령어 데이터 타입에 따라서
		{
			case "undefined":
				return; // 없으면 나가기
			case "string":
				replier.reply(commands[room][msg]);
				break; // 문자열이면 그대로 답장
			case "function":
				replier.reply(commands[room][msg]());
				break; // 함수면 (멤버시 명령어) 호출하고, 그 결과를 답장
			case "object": // 이 객체는 배열이 아닐 수 없음 (배열이 아닌 객체를 넣은 적이 없음)
				replier.reply(getMessageN(commands[room][msg]));
				break; // 객체면 (`(prefix)(이름, 별명)시` 명령어) getMessageN으로
		}
	}
}

function readMemberInfo() // 멤버 정보를 불러오는 함수
{
	let br = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(
		android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/kbot/members.txt"))), tmp, ret = {};
	while((tmp = br.readLine()) != null) // 한 줄씩 읽음
	{
		if((tmp = tmp.trim()) == "") continue; // 비었으면 다음 줄
		if(ret[tmp])
		{
			Log.w("그룹 " + tmp + "이(가) 이미 있습니다. 덮어씁니다.");
		}
		let group = tmp;
		ret[group] = []; // 멤버의 정보를 저장할 배열
		while((tmp = br.readLine()) != null && (tmp = tmp.trim()) != "") // 파일이 끝나거나 빈 줄이 나올 때까지 멤버 추가
		{
			if((tmp = tmp.split("/")).length < 3) // 멤버별로 최소 3개(대표 이름, 태어난 달, 태어난 일) 이상은 있어야 함
			{
				Log.e("멤버 " + tmp[0] + "의 데이터가 잘못되었습니다.");
				continue;
			}
			var temp = tmp.slice(1, 3); // 이번 줄에서 읽은 멤버 정보 ([태어난 달, 태어난 일])
			tmp[2] = tmp[0]; // 라이노 Array.prototype.splice 버그(로 추정) 때문에 slice로 대체
			temp = [tmp.slice(2), parseInt(temp[0]), parseInt(temp[1])]; // 생일을 숫자로 바꾸고 이름, 별명도 추가
			if(isNaN(temp[1]) || isNaN(temp[2]) || temp[1] < 1 || temp[1] > 12 || temp[2] < 0 || temp[2] > 59)
			{ // 유효성 검사
				Log.e("멤버 " + temp[0] + "의 데이터가 잘못되었습니다.");
				continue; // 문제가 있으면 추가하지 않음
			}
			temp.push(temp[1] * 60 + temp[2]); // 멤버 생일을 쓰기 편하게 가공
			ret[group].push(temp); // 추가
		}
	}
	br.close();
	return ret;
}

function readRoomInfo(memberInfo) // 방 정보를 불러오는 함수
{
	let br = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(
		android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/kbot/rooms.txt"))), tmp, ret = [];
	while((tmp = br.readLine()) != null) // 한 줄씩 읽음
	{
		if((tmp = tmp.trim()) == "") continue; // 빈 줄은 패스
		tmp = tmp.split("/");
		let temp = []; // 그 방에 적용할 그룹을 저장할 배열
		let loaded = {}; // 이미 로드했는지 확인하기 위한 임시 연관배열
		for(let i = 2; i < tmp.length; i++)
		{ // 0은 방 이름, 1은 접두사이므로 2번부터
			if(loaded[tmp[i]])
			{ // 이미 불러왔으면 패스
				Log.w("방 " + tmp[0] + "에 그룹 " + tmp[i] + "을 이미 불러왔습니다.");
				continue;
			}
			if(!memberInfo[tmp[i]])
			{ // 그런 그룹 없으면 패스, 오타일 수 있으므로 로그
				Log.w("방 " + tmp[0] + "에 적용할 그룹 " + tmp[i] + "를 찾지 못했습니다.");
				continue;
			}
			temp.push(tmp[i]); // 그룹 추가
		}
		ret.push([tmp[0], tmp[1], temp]); // 방 정보는 [방 이름, 접두사, 그룹 배열] 형태
	}
	br.close();
	return ret;
}

(function () // IIFE, 멤버 정보, 방 정보 불러와서 명령어 추가
{
	let members = readMemberInfo(); // 멤버 정보를 불러옴
	const room = readRoomInfo(members); // 방 정보를 불러오면서 멤버 정보로 유효성 검사까지

	let tmp = {}; // 똑같은 연산 여러 번 하지 않게 캐시

	for(let i = 0; i < room.length; i++)
	{
		let key = room[i][2].sort().join("/"); // 그룹 이름으로 정렬하고 슬래시로 구분
		if(!tmp[key]) // 없으면 어떻게든 만듦
		{
			let temp = []; // 그 방에서 쓸 모든 멤버를 저장할 배열
			for(let j = 0; j < room[i][2].length; j++)
			{ // 모든 그룹의 모든 멤버를 배열에 추가하고
				temp = temp.concat(members[room[i][2][j]]);
			}
			tmp[key] = temp.sort((a, b) => a[3] - b[3]); // 생일 순서대로 정렬
			tmp[key] = [tmp[key], getFunction(tmp[key])]; // 처리 완료!
		} // 이제 tmp[key]에 [멤버 목록, 멤버시 명령어에 쓸 함수]가 있음
		bmc_add(room[i][0], room[i][1], tmp[key][0], tmp[key][1]);
	}
})();
