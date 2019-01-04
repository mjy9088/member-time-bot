/*
 * 카카오톡 봇 - 독립형 - 멤버시
 *
 * 사용 / 수정 / 배포 전에 아래 주소의 글을 읽어보세요!
 * https://gitlab.com/mjy-hobby/kakaotalk-bot/standalone/member-clock
 */

let bmc_commands = {};

function list_members(members)
{
	let ret = "";
	for(let i = 0; i < members.length; i++)
	{
		if(i) ret += "\n";
		ret += members[i][0][0] + "시는 " + members[i][1] + "시 " + members[i][2] + "분입니다.";
	}
	return ret;
}

function bmc_add(room, prefix, members, func)
{
	if(!bmc_commands[room])
	{
		bmc_commands[room] = {};
	}
	bmc_commands[room][prefix + "정보"] = "독립형 멤버시 봇입니다.\n자세한 정보는 https://gitlab.com/mjy-hobby/kakaotalk-bot/standalone/member-clock 에서 확인하실 수 있습니다.";
	for(let i = 0; i < members.length; i++)
	{
		for(let j = 0; j < members[i][0].length; j++)
		{
			if(!bmc_commands[room][prefix + members[i][0][j] + "시"])
			{
				bmc_commands[room][prefix + members[i][0][j] + "시"] = [];
			}
			bmc_commands[room][prefix + members[i][0][j] + "시"].push(members[i]);
		}
	}
	bmc_commands[room][prefix + "멤버시"] = func;
	bmc_commands[room][prefix + "멤버시 목록"] = list_members(members);
}

function time_remain(time, sec)
{
	let ret = time * 60 - sec;
	return ret < 0 ? ret + 43200 : ret;
}

function find_earliest(members, min)
{
	const len = members.length;
	for(let i = 0; i < len; i++)
	{
		if(members[i][3] < min)
		{
			return i;
		}
	}
	return 0;
}

function getMessage1(names, h, m, remains)
{
	let ret =  names.join("시, ") + "시(" + h + "시 " + m + "분)까지 약 ";
	let s = remains % 60;
	let m = (remains = Math.floor(remains / 60)) % 60;
	let h = Math.floor(remains / 60);
	if(h) ret += h + "시간 ";
	if(m) ret += m + "분 ";
	ret += s + "초 남았습니다.";
}

function getMessageN(members)
{
	return "아직 완성되지 않은 기능입니다!";
}

function memberClock(members)
{
	const now = new Date();
	let n = ((now.getHours() + 11) % 12 + 1) * 60 + now.getMinutes();
	let idx = find_earliest(members, n);
	let tmp = [members[idx][0][0]], temp = members[idx];
	while(members[++idx] && members[idx][3] == temp[3])
	{
		tmp.push(members[idx][0][0]);
	}
	return getMessage1(tmp, temp[1], temp[2], time_remain(temp[3], n * 60 + now.getSeconds()));
}

function getFunction(members)
{
	return function ()
	{
		return memberClock(members);
	};
}

function response(room, msg, sender, isGroupChat, replier, imageDB)
{
	room = room.trim();
	msg = msg.trim();
	if(bmc_rooms[room])
	{
		switch(typeof bmc_rooms[room][msg])
		{
			case "undefined":
				return;
			case "string":
				replier.reply(bmc_rooms[room][msg]);
				break;
			case "function":
				replier.reply(bmc_rooms[room][msg]());
				break;
			case "object":
				let now = new Date();
				let n = (((now.getHours() + 11) % 12 + 1) * 60 + now.getMinutes()) * 60 + now.getSeconds();
				replier.reply(getMessageN(bmc_rooms[room][msg]));
				break;
		}
	}
}

function readMemberInfo()
{
	let br = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(
		android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/kbot/members.txt"))), tmp, ret = {};
	while((tmp = br.readLine()) != null)
	{
		if((tmp = tmp.trim()) == "") continue;
		if(ret[tmp])
		{
			Log.w("그룹 " + tmp + "이(가) 이미 있습니다. 덮어씁니다.");
		}
		let group = tmp;
		ret[group] = [];
		while((tmp = br.readLine()) != null && (tmp = tmp.trim()) != "")
		{
			if((tmp = tmp.split("/")).length < 3)
			{
				Log.e("멤버 " + tmp[0] + "의 데이터가 잘못되었습니다.");
				continue;
			}
			var temp = tmp.splice(1, 2);
			temp = [tmp, parseInt(temp[0]), parseInt(temp[1])];
			if(isNaN(temp[1]) || isNaN(temp[2]) || temp[1] < 1 || temp[1] > 12 || temp[2] < 0 || temp[2] > 59)
			{
				Log.e("멤버 " + temp[0] + "의 데이터가 잘못되었습니다.");
				continue;
			}
			temp.push(temp[1] * 60 + temp[2]);
			ret[group].push(temp);
		}
	}
	br.close();
	return ret;
}

function readRoomInfo(memberInfo)
{
	let br = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(
		android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/kbot/rooms.txt"))), tmp, ret = [];
	while((tmp = br.readLine()) != null)
	{
		if((tmp = tmp.trim()) == "") continue;
		tmp = tmp.split("/");
		let temp = [];
		for(let i = 2; i < tmp.length; i++)
		{
			if(!memberInfo[tmp[i]])
			{
				Log.w("방 " + tmp[0] + "에 적용할 그룹 " + tmp[i] + "를 찾지 못했습니다.");
				continue;
			}
			temp.push(tmp[i]);
		}
		ret.push([tmp[0], tmp[1], temp]);
	}
	br.close();
	return ret;
}

(function ()
{
	let members = readMemberInfo();
	const room = readRoomInfo(members);

	let tmp = {};

	for(let i = 0; i < room.length; i++)
	{
		if(!room[i][2]) continue;
		let key = room[i][2].sort().join("/");
		if(!tmp[key])
		{
			let temp = [];
			for(let j = 0; j < room[i][2].length; j++)
			{
				temp = temp.concat(members[room[i][2][j]]);
			}
			tmp[key] = temp.sort((a, b) => a[3] - b[3]);
			tmp[key] = [tmp[key], getFunction(tmp[key])];
		}
		bmc_add(room[i][0], room[i][1], tmp[key][0], tmp[key][1]);
	}
})();
